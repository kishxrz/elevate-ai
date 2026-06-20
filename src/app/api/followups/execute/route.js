import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { checkRoutePermission } from "@/lib/rbacServer";
import { resend } from "@/lib/resend";
import { generateFollowupEmail } from "@/lib/followupGenerator";
import { generateNextFollowup } from "@/lib/followupScheduler";
import { getLeadMemoryContext } from "@/lib/agentEngine";

export async function POST(request) {
  try {
    const { executionId } = await request.json();
    if (!executionId) {
      return NextResponse.json({ error: "Execution ID is required." }, { status: 400 });
    }

    // 1. Restore user session for Supabase client
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

    // 2. Fetch the follow-up execution record
    const { data: execution, error: execErr } = await supabase
      .from("followup_executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (execErr || !execution) {
      console.error("Failed to load execution record:", execErr);
      return NextResponse.json({ error: "Follow-up execution record not found." }, { status: 404 });
    }

    const organizationId = execution.organization_id;

    // 3. Verify execution permission using RBAC
    const isAllowed = await checkRoutePermission(userId, organizationId, "execute_followups");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to execute follow-ups in this workspace." }, { status: 403 });
    }

    // If execution is already processed, return early
    if (execution.status === "sent" || execution.status === "waiting_reply") {
      return NextResponse.json({ success: true, message: "Follow-up has already been executed." });
    }

    // 4. Fetch the lead, sequence, and step templates
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", execution.lead_id)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: "Lead details not found." }, { status: 404 });
    }

    const { data: sequence, error: seqErr } = await supabase
      .from("followup_sequences")
      .select("*")
      .eq("id", execution.sequence_id)
      .single();

    const { data: step, error: stepErr } = await supabase
      .from("followup_steps")
      .select("*")
      .eq("id", execution.step_id)
      .single();

    if (stepErr || !step) {
      return NextResponse.json({ error: "Follow-up step details not found." }, { status: 404 });
    }

    // 5. Fetch prior emails sent in this sequence to provide context to Gemini
    const { data: previousExecutions } = await supabase
      .from("followup_executions")
      .select("email_subject, email_body, executed_at, created_at")
      .eq("lead_id", execution.lead_id)
      .eq("sequence_id", execution.sequence_id)
      .in("status", ["sent", "waiting_reply", "completed", "replied"])
      .order("created_at", { ascending: true });

    // 6. Fetch CRM memories/objections context
    const memories = await getLeadMemoryContext(execution.lead_id);

    // 7. Fetch active deal (if any)
    const { data: deal } = await supabase
      .from("deals")
      .select("*")
      .eq("lead_id", execution.lead_id)
      .order("created_at", { descending: true })
      .limit(1)
      .maybeSingle();

    // 8. Generate personalized copy via Gemini follow-up AI generator
    const aiCopy = await generateFollowupEmail(lead, deal, previousExecutions || [], memories);

    // Personalize subject & body (interpolate client templates if Gemini output falls back or has raw parameters)
    const rawSubject = aiCopy.subject || step.subject_template || "Follow-up outreach";
    const rawBody = aiCopy.body || step.body_template || "";

    const personalize = (text) => {
      if (!text) return "";
      return text
        .replace(/\{\{name\}\}/g, lead.name || "there")
        .replace(/\{\{company\}\}/g, lead.company || "your business");
    };

    const personalizedSubject = personalize(rawSubject);
    const personalizedBody = personalize(rawBody);

    // 9. Send the email using Resend (or Simulation Mode)
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    let messageId = null;
    let emailSent = false;
    let runInSimulation = !process.env.RESEND_API_KEY;

    if (!runInSimulation) {
      try {
        const resendResult = await resend.emails.send({
          from: fromEmail,
          to: lead.email,
          subject: personalizedSubject,
          html: personalizedBody,
        });

        if (resendResult.error) {
          console.warn(`[Resend Followup API Error] falling back to Simulation Mode for ${lead.email}:`, resendResult.error.message);
          runInSimulation = true;
        } else {
          messageId = resendResult.data?.id;
          emailSent = true;
        }
      } catch (apiErr) {
        console.warn(`[Resend Followup Exception] falling back to Simulation Mode for ${lead.email}:`, apiErr.message);
        runInSimulation = true;
      }
    }

    if (runInSimulation) {
      emailSent = true;
      messageId = "simulated_followup_msg_" + Math.random().toString(36).substring(7);
      console.log(`[Resend] [FOLLOW-UP SIMULATION] Sent email to ${lead.email} | Subject: "${personalizedSubject}"`);
    }

    if (!emailSent) {
      throw new Error("Failed to dispatch follow-up email.");
    }

    // 10. Update database state
    // Update execution status to 'waiting_reply'
    const { error: updateErr } = await supabase
      .from("followup_executions")
      .update({
        status: "waiting_reply",
        executed_at: new Date().toISOString(),
        email_subject: personalizedSubject,
        email_body: personalizedBody,
      })
      .eq("id", executionId);

    if (updateErr) throw updateErr;

    // Log event to campaign_events
    await supabase
      .from("campaign_events")
      .insert([{
        event_type: "sent",
        organization_id: organizationId,
        metadata: {
          provider: "resend",
          message_id: messageId,
          simulation: runInSimulation,
          followup_execution_id: executionId,
          step_number: step.step_number,
          sequence_name: sequence?.name || "Outbound Sequence"
        }
      }]);

    // Log CRM Activity feed
    await supabase
      .from("activities")
      .insert([{
        user_id: userId,
        lead_id: execution.lead_id,
        type: "email_sent",
        message: `Follow-up email (Step #${step.step_number}) sent to ${lead.name}`,
        organization_id: organizationId,
        content: {
          followup_execution_id: executionId,
          sequence_name: sequence?.name,
          step_number: step.step_number,
          subject: personalizedSubject,
          simulation: runInSimulation
        }
      }]);

    // Log organization audit logs
    await supabase
      .from("organization_audit_logs")
      .insert([{
        organization_id: organizationId,
        user_id: userId,
        action: "Follow-Up Sent",
        resource_type: "followup_executions",
        resource_id: executionId,
        metadata: {
          lead_name: lead.name,
          sequence_name: sequence?.name,
          step_number: step.step_number,
          simulation: runInSimulation
        }
      }]);

    // Update lead's last activity
    await supabase
      .from("leads")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", execution.lead_id);

    // 11. Schedule the next follow-up step
    let nextExec = null;
    try {
      nextExec = await generateNextFollowup(executionId);
    } catch (schedErr) {
      console.error("Failed to schedule next follow-up step:", schedErr);
    }

    return NextResponse.json({
      success: true,
      message: `Follow-up executed successfully for lead ${lead.name}`,
      sent: {
        subject: personalizedSubject,
        recipient: lead.email,
        simulation: runInSimulation
      },
      nextStepScheduled: !!nextExec
    });

  } catch (err) {
    console.error("Error in followups execute API route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
