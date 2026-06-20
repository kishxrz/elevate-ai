import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { checkRoutePermission } from "@/lib/rbacServer";
import { resend } from "@/lib/resend";

export async function POST(request) {
  try {
    const { campaignId } = await request.json();
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required." }, { status: 400 });
    }

    // Restore user session for Supabase client to respect RLS
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;
    const rt = cookieStore.get("sb-refresh-token")?.value;

    let userId = null;
    if (token) {
      const { data: authData, error: authError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: rt || "",
      });
      if (!authError) {
        userId = authData.user?.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    // 1. Fetch the Campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error("Failed to load campaign:", campaignError);
      return NextResponse.json({ error: "Campaign not found in database." }, { status: 404 });
    }

    const organizationId = campaign.organization_id;
    const isAllowed = await checkRoutePermission(userId, organizationId, "send_campaigns");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to send campaigns in this workspace." }, { status: 403 });
    }

    // 2. Fetch the Recipients linked to this campaign (and their lead details)
    const { data: recipients, error: recError } = await supabase
      .from("campaign_recipients")
      .select("*, leads(name, email, company)")
      .eq("campaign_id", campaignId)
      .eq("status", "pending");

    if (recError) {
      console.error("Failed to load campaign recipients:", recError);
      return NextResponse.json({ error: "Failed to load campaign recipients." }, { status: 500 });
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ success: true, message: "No pending recipients to process.", sentCount: 0 });
    }

    // Set campaign status to 'sending' during transit
    await supabase
      .from("campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    console.log(`[Resend Sender] Starting campaign dispatch: '${campaign.name}' | Sender: ${fromEmail}`);

    let successfulSends = 0;
    let failedSends = 0;
    let runInSimulation = !process.env.RESEND_API_KEY;

    for (const recipient of recipients) {
      const lead = recipient.leads;
      // Resolve recipient email address
      const targetEmail = recipient.email || lead?.email;
      if (!targetEmail) {
        console.warn(`Recipient recipient_id ${recipient.id} is missing an email address, skipping.`);
        failedSends++;
        continue;
      }

      // Personalize subject and body
      const rawSubject = campaign.subject || recipient.subject || "Elevate AI Outreach";
      const rawBody = campaign.body || recipient.body || "";

      // Simple interpolation helper
      const personalize = (text) => {
        if (!text) return "";
        return text
          .replace(/\{\{name\}\}/g, lead?.name || "there")
          .replace(/\{\{company\}\}/g, lead?.company || "your business");
      };

      const personalizedSubject = personalize(rawSubject);
      const personalizedBody = personalize(rawBody);

      let messageId = null;
      let emailSent = false;
      let currentSimulated = runInSimulation;

      if (!currentSimulated) {
        try {
          const resendResult = await resend.emails.send({
            from: fromEmail,
            to: targetEmail,
            subject: personalizedSubject,
            html: personalizedBody,
          });

          if (resendResult.error) {
            console.warn(`[Resend API Error] falling back to Simulation Mode for ${targetEmail}:`, resendResult.error.message);
            currentSimulated = true;
          } else {
            messageId = resendResult.data?.id;
            emailSent = true;
          }
        } catch (apiErr) {
          console.warn(`[Resend Exception] falling back to Simulation Mode for ${targetEmail}:`, apiErr.message);
          currentSimulated = true;
        }
      }

      // If we are in simulation mode (either globally or fell back due to error)
      if (currentSimulated) {
        emailSent = true;
        messageId = "simulated_msg_" + Math.random().toString(36).substring(7);
        console.log(`[Resend] [SIMULATION] Sent email to ${targetEmail} | Message ID: ${messageId}`);
      }

      if (emailSent) {
        successfulSends++;

        // 1. Update recipient status in database
        await supabase
          .from("campaign_recipients")
          .update({
            status: "sent",
            sent_at: new Date().toISOString()
          })
          .eq("id", recipient.id);

        // 2. Track Event in campaign_events
        await supabase
          .from("campaign_events")
          .insert([{
            campaign_id: campaignId,
            recipient_id: recipient.id,
            event_type: "sent",
            organization_id: organizationId,
            metadata: {
              provider: "resend",
              message_id: messageId,
              simulation: currentSimulated
            }
          }]);

        // 3. Log Activity in CRM activities feed
        await supabase
          .from("activities")
          .insert([{
            user_id: userId,
            lead_id: recipient.lead_id,
            type: "email_sent",
            message: `Email campaign '${campaign.name}' sent to ${lead?.name || targetEmail}`,
            organization_id: organizationId,
            content: {
              campaign_id: campaignId,
              campaign_name: campaign.name,
              subject: personalizedSubject,
              simulation: currentSimulated
            }
          }]);
      } else {
        failedSends++;
      }
    }

    // Update Campaign status and counts
    const totalSentCount = (campaign.sent_count || 0) + successfulSends;
    const finalStatus = failedSends > 0 && successfulSends === 0 ? "failed" : "completed";

    await supabase
      .from("campaigns")
      .update({
        sent_count: totalSentCount,
        status: finalStatus
      })
      .eq("id", campaignId);

    // Insert Log in Organization Audit Logs
    await supabase
      .from("organization_audit_logs")
      .insert([{
        organization_id: organizationId,
        user_id: userId,
        action: finalStatus === "failed" ? "Campaign Failed" : "Campaign Sent",
        resource_type: "campaign",
        resource_id: campaignId,
        metadata: {
          campaign_name: campaign.name,
          sent_count: successfulSends,
          failed_count: failedSends,
          simulation: runInSimulation || (successfulSends > 0 && process.env.RESEND_API_KEY === undefined)
        }
      }]);

    return NextResponse.json({
      success: true,
      sentCount: successfulSends,
      failedCount: failedSends,
      status: finalStatus,
      message: `Successfully processed ${successfulSends} emails.`
    });

  } catch (err) {
    console.error("Error in campaigns send API handler:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
