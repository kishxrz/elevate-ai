import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { checkRoutePermission } from "@/lib/rbacServer";

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
      if (authError) {
        console.error("Failed to restore Supabase session in send-campaign:", authError);
      } else {
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
      .select("*, leads(name, email)")
      .eq("campaign_id", campaignId)
      .eq("status", "pending");

    if (recError) {
      console.error("Failed to load campaign recipients:", recError);
      return NextResponse.json({ error: "Failed to load campaign recipients." }, { status: 500 });
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ success: true, message: "No pending recipients to process.", sentCount: 0 });
    }

    // 3. Check Google/Gmail Connection
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("google_connected, google_refresh_token")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Failed to fetch user connection profile:", profileError);
    }

    const hasCredentials = clientId && clientSecret;
    const isConnected = profile?.google_connected && profile?.google_refresh_token;

    let runInSimulation = !hasCredentials || !isConnected;
    let gmailAccessToken = null;

    if (!runInSimulation) {
      console.log(`[Gmail Sender] Fetching access token for user ${userId}`);
      try {
        // Refresh token exchange
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: profile.google_refresh_token,
            grant_type: "refresh_token",
          }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenResponse.ok) {
          gmailAccessToken = tokenData.access_token;
        } else {
          console.error("Gmail OAuth refresh failed. Falling back to Simulation Mode:", tokenData);
          runInSimulation = true;
        }
      } catch (err) {
        console.error("Error refreshing Google tokens. Falling back to Simulation Mode:", err);
        runInSimulation = true;
      }
    }

    console.log(`[Campaign Sender] Executing campaign: '${campaign.name}' | Recipients: ${recipients.length} | Simulation: ${runInSimulation}`);

    let successfulSends = 0;

    for (const recipient of recipients) {
      const lead = recipient.leads;
      if (!lead || !lead.email) {
        console.warn(`Recipient lead ${recipient.lead_id} missing email, skipping.`);
        continue;
      }

      let emailSentSuccessfully = false;

      if (!runInSimulation && gmailAccessToken) {
        try {
          // Send real email via Gmail REST API
          const subject = recipient.subject || `Outreach from Elevate AI`;
          const body = recipient.body || `<p>Hello ${lead.name},</p>`;

          // Simple MIME raw message format
          const rawMime = [
            `To: ${lead.email}`,
            `Subject: ${subject}`,
            `Content-Type: text/html; charset=utf-8`,
            `MIME-Version: 1.0`,
            ``,
            body
          ].join("\n");

          // Base64URL encode raw message
          const base64Raw = Buffer.from(rawMime)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

          const gmailSendUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
          const gmailResponse = await fetch(gmailSendUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${gmailAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              raw: base64Raw,
            }),
          });

          const gmailResult = await gmailResponse.json();
          if (gmailResponse.ok) {
            emailSentSuccessfully = true;
            console.log(`[Gmail Sender] Real email delivered to ${lead.email}: Message ID ${gmailResult.id}`);
          } else {
            console.error(`[Gmail Sender] Gmail API error sending to ${lead.email}:`, gmailResult);
          }
        } catch (sendErr) {
          console.error(`[Gmail Sender] Real email delivery exception to ${lead.email}:`, sendErr);
        }
      } else {
        // Simulation Mode: Success is assumed
        emailSentSuccessfully = true;
        console.log(`[Gmail Sender] [SIMULATION] Email sent to ${lead.email} for campaign '${campaign.name}'`);
      }

      if (emailSentSuccessfully) {
        successfulSends++;

        // 1. Update recipient status in Supabase
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
            lead_id: recipient.lead_id,
            event_type: "sent"
          }]);

        // 3. Log Activity in activities log
        await supabase
          .from("activities")
          .insert([{
            user_id: userId,
            lead_id: recipient.lead_id,
            type: "email_sent",
            message: `Email campaign '${campaign.name}' sent to ${lead.name} (${lead.email})`,
            content: {
              campaign_id: campaignId,
              campaign_name: campaign.name,
              subject: recipient.subject,
              simulation: runInSimulation
            }
          }]);
      }
    }

    // 4. Update Campaign Metrics and Status
    const newSentCount = (campaign.sent_count || 0) + successfulSends;
    const { error: updateCampaignError } = await supabase
      .from("campaigns")
      .update({
        sent_count: newSentCount,
        status: "sent"
      })
      .eq("id", campaignId);

    if (updateCampaignError) {
      console.error("Failed to update campaign send stats:", updateCampaignError);
    }

    return NextResponse.json({
      success: true,
      simulation: runInSimulation,
      sentCount: successfulSends,
      message: `Successfully processed ${successfulSends} campaign outreach emails.`
    });

  } catch (err) {
    console.error("Error in send-campaign route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
