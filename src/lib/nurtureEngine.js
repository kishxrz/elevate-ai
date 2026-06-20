import { supabase } from "./supabase";
import { queueApprovalRequiredTask } from "./agentEngine";
import { triggerFollowupAutomations } from "./followupScheduler";

/**
 * Evaluates the nurture status for a lead based on priority, last activity, AI score, and appointment status.
 * Updates and persists the computed nurture_status inside Supabase.
 * 
 * Nurture Status categories:
 * - Ready To Close: Lead has an active appointment (upcoming/confirmed/pending), stage is "Appointment Booked", or priority is "Hot" and score >= 80.
 * - Needs Immediate Followup: priority is Hot/Warm, has a cancelled appointment, or last activity was more than 3 days ago.
 * - At Risk: Last activity was more than 7 days ago.
 * - Cold: Default status if no other active qualifiers apply.
 * 
 * @param {string} leadId - The UUID of the lead to evaluate.
 * @returns {Promise<string|null>} The computed nurture status, or null on error.
 */
export async function evaluateAndStoreNurtureStatus(leadId) {
  try {
    if (!leadId) throw new Error("Lead ID is required for nurture status evaluation");

    // 1. Fetch Lead Details
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, priority, score, last_activity_at, status")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      console.error(`Error fetching lead ${leadId} for nurture status evaluation:`, leadError);
      return null;
    }

    // 2. Fetch Appointments for the lead
    const { data: appointments, error: aptError } = await supabase
      .from("appointments")
      .select("status")
      .eq("lead_id", leadId);

    const apts = appointments || [];

    // Extract details
    const priority = lead.priority || "Cold";
    const score = Number(lead.score !== null && lead.score !== undefined ? lead.score : 0);
    const leadStatus = lead.status || "New Lead";
    const lastActivity = lead.last_activity_at ? new Date(lead.last_activity_at) : null;
    const now = new Date();
    
    // Compute days since last activity
    const daysSinceLastActivity = lastActivity ? (now - lastActivity) / (1000 * 60 * 60 * 24) : 999;

    // Check appointment categories
    const hasActiveAppointment = apts.some(apt => 
      ["upcoming", "confirmed", "pending"].includes(String(apt.status).toLowerCase())
    );
    const hasCancelledAppointment = apts.some(apt => 
      ["cancelled"].includes(String(apt.status).toLowerCase())
    );

    // 3. Evaluate nurture status category
    let nurtureStatus = "Cold";

    if (hasActiveAppointment || leadStatus === "Appointment Booked" || (priority === "Hot" && score >= 80)) {
      nurtureStatus = "Ready To Close";
    } else if (daysSinceLastActivity > 7) {
      nurtureStatus = "At Risk";
    } else if (
      daysSinceLastActivity > 3 || 
      priority === "Hot" || 
      priority === "Warm" || 
      hasCancelledAppointment || 
      leadStatus === "New Lead"
    ) {
      nurtureStatus = "Needs Immediate Followup";
    } else {
      nurtureStatus = "Cold";
    }

    console.log(`[Nurture Engine] Lead ${leadId} evaluated as: ${nurtureStatus} (Score: ${score}, Priority: ${priority}, Status: ${leadStatus}, Days since activity: ${daysSinceLastActivity.toFixed(2)})`);

    // 4. Persist in database
    const { error: updateError } = await supabase
      .from("leads")
      .update({ nurture_status: nurtureStatus })
      .eq("id", leadId);

    if (updateError) {
      console.error(`Failed to update nurture_status for lead ${leadId}:`, updateError);
      return null;
    }

    // Trigger Autonomous Agent triggers (Drafts & queues tasks for approval)
    try {
      if (nurtureStatus === "Ready To Close") {
        const { data: existing } = await supabase
          .from("agent_tasks")
          .select("id")
          .eq("lead_id", leadId)
          .eq("task_type", "outreach_email")
          .eq("status", "pending_approval");
        
        if (!existing || existing.length === 0) {
          await queueApprovalRequiredTask(leadId, "outreach_email", "", lead.user_id);
        }
      } else if (nurtureStatus === "Needs Immediate Followup") {
        const { data: existing } = await supabase
          .from("agent_tasks")
          .select("id")
          .eq("lead_id", leadId)
          .eq("task_type", "followup")
          .eq("status", "pending_approval");
        
        if (!existing || existing.length === 0) {
          await queueApprovalRequiredTask(leadId, "followup", "", lead.user_id);
        }
      }
    } catch (agentErr) {
      console.error("Error triggering autonomous agent task draft queue:", agentErr);
    }

    // Trigger follow-up sequence automations
    triggerFollowupAutomations(leadId).catch(err => {
      console.error("[Nurture Engine] Failed to trigger followup automations:", err);
    });

    return nurtureStatus;
  } catch (err) {
    console.error("Error in evaluateAndStoreNurtureStatus:", err);
    return null;
  }
}
