import { supabase } from "./supabase";

/**
 * Creates a new follow-up sequence with its corresponding steps.
 */
export async function createFollowupSequence(orgId, name, description, steps, userId = null) {
  try {
    const { data: sequence, error: seqErr } = await supabase
      .from("followup_sequences")
      .insert([{
        organization_id: orgId,
        name,
        description,
        created_by: userId
      }])
      .select()
      .single();

    if (seqErr) throw seqErr;

    const stepInserts = steps.map((s, index) => ({
      sequence_id: sequence.id,
      step_number: index + 1,
      delay_days: Number(s.delay_days) || 0,
      step_type: s.step_type || 'followup',
      subject_template: s.subject_template || '',
      body_template: s.body_template || ''
    }));

    if (stepInserts.length > 0) {
      const { error: stepsErr } = await supabase
        .from("followup_steps")
        .insert(stepInserts);
      if (stepsErr) throw stepsErr;
    }

    return sequence;
  } catch (err) {
    console.error("Scheduler: createFollowupSequence failed:", err);
    throw err;
  }
}

/**
 * Schedules the first step of a follow-up sequence for a lead.
 */
export async function scheduleFollowup(orgId, leadId, sequenceId, userId = null) {
  try {
    // 1. Fetch steps for the sequence
    const { data: steps, error: stepsErr } = await supabase
      .from("followup_steps")
      .select("*")
      .eq("sequence_id", sequenceId)
      .order("step_number", { ascending: true });

    if (stepsErr) throw stepsErr;
    if (!steps || steps.length === 0) {
      throw new Error("Cannot schedule sequence: No steps configured.");
    }

    const firstStep = steps[0];
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + (firstStep.delay_days || 0));

    // 2. Fetch Lead context for AI context snapshot
    const { data: lead } = await supabase
      .from("leads")
      .select("score, nurture_status, ai_summary")
      .eq("id", leadId)
      .single();

    const contextSnapshot = {
      lead_score: lead?.score || 0,
      nurture_status: lead?.nurture_status || "New Lead",
      pain_points: lead?.ai_summary ? [lead.ai_summary] : []
    };

    // 3. Create scheduled execution row
    const { data: execution, error: execErr } = await supabase
      .from("followup_executions")
      .insert([{
        organization_id: orgId,
        lead_id: leadId,
        sequence_id: sequenceId,
        step_id: firstStep.id,
        status: "scheduled",
        scheduled_for: scheduledDate.toISOString(),
        context_snapshot: contextSnapshot,
        influenced_revenue: 0
      }])
      .select()
      .single();

    if (execErr) throw execErr;

    console.log(`[Follow-Up Scheduler] Scheduled step 1 of sequence ${sequenceId} for lead ${leadId}`);
    return execution;
  } catch (err) {
    console.error("Scheduler: scheduleFollowup failed:", err);
    throw err;
  }
}

/**
 * Cancels all pending or scheduled executions for a given lead.
 */
export async function cancelSequence(leadId) {
  try {
    const { data, error } = await supabase
      .from("followup_executions")
      .update({ status: "cancelled" })
      .eq("lead_id", leadId)
      .in("status", ["scheduled", "pending", "waiting_reply"]);

    if (error) throw error;
    console.log(`[Follow-Up Scheduler] Cancelled all pending sequences for lead ${leadId}`);
    return data;
  } catch (err) {
    console.error("Scheduler: cancelSequence failed:", err);
    throw err;
  }
}

/**
 * Marks a specific execution as completed.
 */
export async function markSequenceCompleted(executionId) {
  try {
    const { data, error } = await supabase
      .from("followup_executions")
      .update({ status: "completed" })
      .eq("id", executionId);

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Scheduler: markSequenceCompleted failed:", err);
    throw err;
  }
}

/**
 * Computes and schedules the next step in the sequence based on the completed execution.
 */
export async function generateNextFollowup(executionId) {
  try {
    // 1. Fetch current execution row details
    const { data: completedExec, error: execErr } = await supabase
      .from("followup_executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (execErr || !completedExec) {
      throw new Error(`Failed to load completed execution ${executionId}: ${execErr?.message}`);
    }

    // 2. Fetch completed step details to get step_number
    const { data: completedStep, error: stepErr } = await supabase
      .from("followup_steps")
      .select("*")
      .eq("id", completedExec.step_id)
      .single();

    if (stepErr || !completedStep) {
      throw new Error(`Failed to load completed step ${completedExec.step_id}: ${stepErr?.message}`);
    }

    // 3. Find next step in the sequence
    const { data: nextStep, error: nextStepErr } = await supabase
      .from("followup_steps")
      .select("*")
      .eq("sequence_id", completedExec.sequence_id)
      .eq("step_number", completedStep.step_number + 1)
      .single();

    if (nextStepErr && nextStepErr.code !== 'PGRST116') { // PGRST116 is single row empty result error code
      throw nextStepErr;
    }

    // If no next step, the sequence has reached completion
    if (!nextStep) {
      console.log(`[Follow-Up Scheduler] Sequence ${completedExec.sequence_id} completed for lead ${completedExec.lead_id} (no more steps)`);
      
      // Update final execution status to completed
      await supabase
        .from("followup_executions")
        .update({ status: "completed" })
        .eq("id", executionId);
        
      return null;
    }

    // 4. Compute next schedule time
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + (nextStep.delay_days || 0));

    // Fetch fresh Lead context
    const { data: lead } = await supabase
      .from("leads")
      .select("score, nurture_status, ai_summary")
      .eq("id", completedExec.lead_id)
      .single();

    const contextSnapshot = {
      lead_score: lead?.score || 0,
      nurture_status: lead?.nurture_status || "Warm",
      pain_points: lead?.ai_summary ? [lead.ai_summary] : []
    };

    // 5. Insert next scheduled execution
    const { data: nextExec, error: nextExecErr } = await supabase
      .from("followup_executions")
      .insert([{
        organization_id: completedExec.organization_id,
        lead_id: completedExec.lead_id,
        sequence_id: completedExec.sequence_id,
        step_id: nextStep.id,
        status: "scheduled",
        scheduled_for: scheduledDate.toISOString(),
        context_snapshot: contextSnapshot,
        influenced_revenue: 0
      }])
      .select()
      .single();

    if (nextExecErr) throw nextExecErr;

    console.log(`[Follow-Up Scheduler] Transitioned execution ${executionId}. Scheduled step #${nextStep.step_number} for lead ${completedExec.lead_id} on ${scheduledDate.toISOString()}`);
    return nextExec;
  } catch (err) {
    console.error("Scheduler: generateNextFollowup failed:", err);
    throw err;
  }
}

/**
 * Evaluates and applies follow-up sequence automation triggers for a lead.
 * Triggers based on priority changes, nurture status changes, and activity ages.
 */
export async function triggerFollowupAutomations(leadId) {
  try {
    // 1. Fetch lead details
    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, organization_id, priority, nurture_status, status, last_activity_at, created_at")
      .eq("id", leadId)
      .single();

    if (error || !lead) return;

    const orgId = lead.organization_id;
    const priority = lead.priority || "Cold";
    const nurtureStatus = lead.nurture_status || "Cold";
    const leadStatus = lead.status || "New Lead";

    // 2. Cancellation Triggers:
    // "If Lead Replies or Deal is Won -> Cancel remaining steps"
    const isTerminated = 
      ["closed won", "won", "closed lost", "lost", "replied", "do not contact", "opted out", "unsubscribed"].includes(leadStatus.toLowerCase()) ||
      ["closed won", "won", "closed lost", "lost", "replied"].includes(nurtureStatus.toLowerCase());

    if (isTerminated) {
      await cancelSequence(lead.id);
      return;
    }

    // 3. Cold Lead Recovery Campaign:
    // "No Activity 30 Days -> Auto Recovery Campaign"
    const now = new Date();
    const lastActivityStr = lead.last_activity_at || lead.created_at;
    const lastActivity = lastActivityStr ? new Date(lastActivityStr) : now;
    const daysSinceActivity = (now - lastActivity) / (1000 * 60 * 60 * 24);

    if (priority === "Cold" && daysSinceActivity >= 30) {
      // Find or create "Cold Lead Recovery Sequence"
      const sequenceId = await findOrCreateSequence(orgId, "Cold Lead Recovery Sequence", "Recovery", [
        { delay_days: 0, step_type: "initial", subject_template: "Re-engaging regarding {{company}}", body_template: "<p>Hi {{name}},</p><p>It's been a while since we last spoke. I wanted to see if you are still looking to optimize your CRM processes?</p>" },
        { delay_days: 7, step_type: "followup", subject_template: "Unlocking CRM potential", body_template: "<p>Hi {{name}},</p><p>Just checking back. We launched new features that might be helpful. Let me know if you want a quick demo.</p>" }
      ]);
      
      // Check if already scheduled/sent for this recovery sequence to avoid duplicate scheduling
      const hasRecovery = await checkIfSequenceScheduled(lead.id, sequenceId);
      if (!hasRecovery) {
        await scheduleFollowup(orgId, lead.id, sequenceId);
      }
      return;
    }

    // 4. Auto-Schedule triggers for Hot / Warm / Ready To Close:
    if (nurtureStatus === "Ready To Close" || leadStatus === "Ready To Close") {
      // Find or create "Meeting Request Sequence"
      const sequenceId = await findOrCreateSequence(orgId, "Meeting Request Sequence", "Meeting Request", [
        { delay_days: 0, step_type: "meeting_request", subject_template: "Book a quick call, {{name}}?", body_template: "<p>Hi {{name}},</p><p>We are ready to align on your requirements. Please pick a time on my calendar: <a href='#'>sync calendar</a>.</p>" },
        { delay_days: 3, step_type: "followup", subject_template: "Re: Book a quick call?", body_template: "<p>Hi {{name}},</p><p>Just checking back if you had a moment to choose a slot. Looking forward to speaking.</p>" }
      ]);
      
      const hasSeq = await checkIfSequenceScheduled(lead.id, sequenceId);
      if (!hasSeq) {
        await cancelSequence(lead.id); // Cancel other sequences first
        await scheduleFollowup(orgId, lead.id, sequenceId);
      }
    } else if (priority === "Hot") {
      // Find or create "Follow-Up Sequence"
      const sequenceId = await findOrCreateSequence(orgId, "Follow-Up Sequence", "Follow-Up", [
        { delay_days: 0, step_type: "initial", subject_template: "Connecting regarding {{company}}", body_template: "<p>Hi {{name}},</p><p>I noticed you are looking at CRM platforms. I'd love to show you how we double response rates.</p>" },
        { delay_days: 3, step_type: "followup", subject_template: "Re: Connecting", body_template: "<p>Hi {{name}},</p><p>Checking if you received my last email. Let me know if you have 10 mins next week.</p>" }
      ]);

      const hasSeq = await checkIfSequenceScheduled(lead.id, sequenceId);
      if (!hasSeq) {
        await cancelSequence(lead.id);
        await scheduleFollowup(orgId, lead.id, sequenceId);
      }
    } else if (priority === "Warm") {
      // Find or create "Nurture Sequence"
      const sequenceId = await findOrCreateSequence(orgId, "Nurture Sequence", "Nurture", [
        { delay_days: 0, step_type: "case_study", subject_template: "Case Study: 40% growth in pipeline", body_template: "<p>Hi {{name}},</p><p>I wanted to share how we helped other teams scale their pipeline. Read the case study here.</p>" },
        { delay_days: 5, step_type: "followup", subject_template: "Thoughts on the case study?", body_template: "<p>Hi {{name}},</p><p>Did you have a chance to read the study? Let me know if you have any questions.</p>" }
      ]);

      const hasSeq = await checkIfSequenceScheduled(lead.id, sequenceId);
      if (!hasSeq) {
        await cancelSequence(lead.id);
        await scheduleFollowup(orgId, lead.id, sequenceId);
      }
    }

  } catch (err) {
    console.error("Error running followup triggers:", err);
  }
}

/**
 * Checks if a sequence is already scheduled or active for a lead.
 */
async function checkIfSequenceScheduled(leadId, sequenceId) {
  const { data, error } = await supabase
    .from("followup_executions")
    .select("id")
    .eq("lead_id", leadId)
    .eq("sequence_id", sequenceId)
    .in("status", ["scheduled", "pending", "waiting_reply", "sent"]);
    
  return data && data.length > 0;
}

/**
 * Finds a sequence by name, or creates a default one.
 */
async function findOrCreateSequence(orgId, name, defaultType, defaultSteps) {
  const { data: existing } = await supabase
    .from("followup_sequences")
    .select("id")
    .eq("organization_id", orgId)
    .ilike("name", `%${name}%`)
    .limit(1)
    .maybeSingle();
    
  if (existing) return existing.id;
  
  // Create default sequence
  const { data: newSeq, error } = await supabase
    .from("followup_sequences")
    .insert([{
      organization_id: orgId,
      name,
      description: `Auto-generated default ${defaultType} sequence.`
    }])
    .select()
    .single();
    
  if (error) throw error;
  
  const stepInserts = defaultSteps.map((s, idx) => ({
    sequence_id: newSeq.id,
    step_number: idx + 1,
    delay_days: s.delay_days,
    step_type: s.step_type,
    subject_template: s.subject_template,
    body_template: s.body_template
  }));
  
  await supabase.from("followup_steps").insert(stepInserts);
  
  return newSeq.id;
}
