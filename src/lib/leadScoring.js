import { supabase } from "./supabase";
import { evaluateAndStoreNurtureStatus } from "./nurtureEngine";

/**
 * Calculates the final priority score for a lead based on:
 * Final Score = AI Score + Lead Value Weight + Recent Activity Weight + Appointment Weight
 * 
 * Returns the final score, priority status, and updates the database row.
 * 
 * @param {string} leadId - The UUID of the lead to score.
 */
export async function calculateAndStoreLeadPriority(leadId) {
  try {
    if (!leadId) throw new Error("Lead ID is required for scoring");

    // 1. Fetch Lead Details
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("value, ai_score, score, user_id")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      console.error(`Error fetching lead ${leadId} for scoring:`, leadError);
      return null;
    }

    // Base score is the original AI score generated during qualification (default to 0 if not qualified yet)
    // Fall back to general score if ai_score is null
    const aiScore = Number(lead.ai_score !== null && lead.ai_score !== undefined ? lead.ai_score : (lead.score || 0));

    // 2. Fetch Activities count
    const { data: activities, error: actError } = await supabase
      .from("activities")
      .select("id")
      .eq("lead_id", leadId);

    const activityCount = actError || !activities ? 0 : activities.length;

    // 3. Fetch Appointments
    const { data: appointments, error: aptError } = await supabase
      .from("appointments")
      .select("status")
      .eq("lead_id", leadId);

    const apts = appointments || [];

    // --- Weights Calculation ---
    
    // 1. Lead Value Weight
    let valueWeight = 0;
    const value = Number(lead.value) || 0;
    if (value >= 10000) {
      valueWeight = 20;
    } else if (value >= 5000) {
      valueWeight = 15;
    } else if (value >= 1000) {
      valueWeight = 10;
    } else if (value > 0) {
      valueWeight = 5;
    }

    // 2. Recent Activity Weight
    let activityWeight = 0;
    if (activityCount >= 5) {
      activityWeight = 15;
    } else if (activityCount >= 3) {
      activityWeight = 10;
    } else if (activityCount >= 1) {
      activityWeight = 5;
    }

    // 3. Appointment Weight
    let appointmentWeight = 0;
    const hasActiveAppointment = apts.some(apt => 
      ["upcoming", "confirmed", "pending"].includes(String(apt.status).toLowerCase())
    );
    const hasCancelledAppointment = apts.some(apt => 
      ["cancelled"].includes(String(apt.status).toLowerCase())
    );

    if (hasActiveAppointment) {
      appointmentWeight = 20;
    } else if (hasCancelledAppointment) {
      appointmentWeight = -10;
    }

    // Final Score Calculation
    let finalScore = aiScore + valueWeight + activityWeight + appointmentWeight;
    finalScore = Math.min(100, Math.max(0, finalScore));

    // Priority Classification
    let priority = "Cold";
    if (finalScore >= 80) {
      priority = "Hot";
    } else if (finalScore >= 50) {
      priority = "Warm";
    }

    // 4. Update Lead record in database
    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update({
        score: finalScore,
        priority: priority,
        ai_status: priority, // ensure compatibility with legacy views
        last_activity_at: new Date().toISOString()
      })
      .eq("id", leadId)
      .select()
      .single();

    if (updateError) {
      console.error(`Failed to update priority for lead ${leadId}:`, updateError);
      return null;
    }

    // Evaluate and update nurture status automatically
    await evaluateAndStoreNurtureStatus(leadId);

    return {
      score: finalScore,
      priority,
      lead: updatedLead
    };
  } catch (err) {
    console.error("Error in calculateAndStoreLeadPriority:", err);
    return null;
  }
}
