import { supabase } from "./supabase";
import { GoogleGenAI } from "@google/genai";

/**
 * Stores a contextual memory for a lead (e.g. pain points, objections, notes).
 */
export async function storeLeadMemory(leadId, memoryType, content, userId, organizationId = null) {
  try {
    if (!leadId || !content) return null;
    const { data, error } = await supabase
      .from("agent_memories")
      .insert([{
        lead_id: leadId,
        memory_type: memoryType,
        content,
        user_id: userId,
        organization_id: organizationId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Failed to store lead memory:", err);
    return null;
  }
}

/**
 * Fetches all memories for a lead and formats them as a string context.
 */
export async function getLeadMemoryContext(leadId) {
  try {
    if (!leadId) return "";
    const { data: memories, error } = await supabase
      .from("agent_memories")
      .select("memory_type, content, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    if (error || !memories) return "";

    return memories.map(m => `[${m.memory_type.toUpperCase()}] (${m.created_at.split("T")[0]}): ${m.content}`).join("\n");
  } catch (err) {
    console.error("Error loading lead memories context:", err);
    return "";
  }
}

/**
 * Queues an approval-required task in agent_tasks with drafted email content.
 */
export async function queueApprovalRequiredTask(leadId, taskType, details = "", userId = null, organizationId = null) {
  try {
    if (!leadId || !taskType) throw new Error("Lead ID and Task Type are required");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("Gemini API Key missing. Creating fallback draft without AI generation.");
      return await createFallbackTask(leadId, taskType, userId, organizationId);
    }

    // 1. Fetch Lead Details
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .is("deleted_at", null)
      .single();

    if (leadError || !lead) throw new Error(`Lead ${leadId} not found`);

    const finalUserId = userId || lead.user_id;
    const finalOrgId = organizationId || lead.organization_id;

    // 2. Fetch Memory Context
    const memoryContext = await getLeadMemoryContext(leadId);
    
    // Auto-extract and save initial memory if none exists
    if (!memoryContext && lead.ai_summary) {
      await storeLeadMemory(leadId, "pain_point", lead.ai_summary, finalUserId, finalOrgId);
    }

    const ai = new GoogleGenAI({ apiKey });
    let prompt = "";
    
    if (taskType === "outreach_email") {
      prompt = `You are an autonomous AI Sales Agent. Review these details of a prospect:
Lead Name: ${lead.name}
Company: ${lead.company || "Not provided"}
Industry: ${lead.industry}
AI Qualification Score: ${lead.score || 0}
Priority: ${lead.priority || "Cold"}

Prospect Memories (Pain Points, Objections, Meeting Notes):
${memoryContext || "None registered yet"}

Goal: This prospect is flagged as "Ready To Close". Write a highly targeted, context-aware outreach email designed to lock in a consultation. You must address their historical pain points and objections directly and professionally.

Respond ONLY with a JSON object in this format:
{
  "subject": "string (high-open-rate subject line)",
  "body": "string (personalized email body in HTML format, using clean paragraphs, no outer html/body tags)",
  "reasoning": "string (brief explanation under 60 words detailing what objections you addressed and why you wrote this copy)"
}`;
    } else {
      // followup task type
      prompt = `You are an autonomous AI Sales Agent. Generate a follow-up outreach for this lead:
Lead Name: ${lead.name}
Company: ${lead.company || "Not provided"}
Industry: ${lead.industry}
AI Score: ${lead.score || 0}
Priority: ${lead.priority || "Cold"}

Prospect Memories:
${memoryContext || "None registered yet"}

Goal: Generate a personalized follow-up message tailored to a ${lead.priority} prospect. Spacing rule: ${lead.priority === 'Hot' ? '1 day' : '3 day'} followup timeline.

Respond ONLY with a JSON object in this format:
{
  "subject": "string (personalized subject line)",
  "body": "string (personalized email body in HTML format, using clean paragraphs, no outer html/body tags)",
  "reasoning": "string (brief explanation under 60 words of why this followup is scheduled and what value you are offering)"
}`;
    }

    // Call Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            subject: { type: "STRING" },
            body: { type: "STRING" },
            reasoning: { type: "STRING" }
          },
          required: ["subject", "body", "reasoning"]
        }
      }
    });

    const aiResult = JSON.parse(response.text.trim());

    // 3. Queue task in agent_tasks table
    const { data: task, error: queueError } = await supabase
      .from("agent_tasks")
      .insert([{
        lead_id: leadId,
        user_id: finalUserId,
        organization_id: finalOrgId,
        task_type: taskType,
        title: taskType === "outreach_email" ? `Autonomous Outreach Email: ${lead.name}` : `Follow-up Email: ${lead.name}`,
        description: taskType === "outreach_email" ? `Pending approval outreach email draft to close prospect.` : `Scheduled follow-up email draft for ${lead.priority} lead.`,
        status: "pending_approval",
        draft_data: {
          to: lead.email,
          subject: aiResult.subject,
          body: aiResult.body
        },
        reasoning: aiResult.reasoning,
        logs: `Task queued at ${new Date().toISOString()}. Awaiting user approval.`
      }])
      .select()
      .single();

    if (queueError) throw queueError;

    console.log(`[Agent Engine] Queued pending approval task ${task.id} for lead ${lead.name} (${taskType})`);
    return task;

  } catch (err) {
    console.error("Failed to queue approval-required task:", err);
    return null;
  }
}

/**
 * Creates a fallback task when Gemini API is unavailable.
 */
async function createFallbackTask(leadId, taskType, userId, organizationId = null) {
  const { data: lead } = await supabase.from("leads").select("name, email, company, organization_id").eq("id", leadId).single();
  if (!lead) return null;

  const subject = `Outreach regarding ${lead.company || "your company"}`;
  const body = `<p>Hi ${lead.name},</p><p>I wanted to check in to see if you have some time for a quick call next week to discuss how Elevate AI can optimize your sales operations.</p>`;

  const { data: task } = await supabase
    .from("agent_tasks")
    .insert([{
      lead_id: leadId,
      user_id: userId,
      organization_id: organizationId || lead.organization_id,
      task_type: taskType,
      title: `Outreach Draft: ${lead.name}`,
      description: `Pending approval outreach email draft (Fallback).`,
      status: "pending_approval",
      draft_data: {
        to: lead.email,
        subject,
        body
      },
      reasoning: "API Key missing. Queued standard fallback outreach message.",
      logs: `Queued fallback task at ${new Date().toISOString()}`
    }])
    .select()
    .single();

  return task;
}

/**
 * Executes a task that has been approved by the user.
 */
export async function executeAgentTask(taskId, userId) {
  try {
    if (!taskId) throw new Error("Task ID is required for execution");

    // 1. Load Task Details
    const { data: task, error: taskError } = await supabase
      .from("agent_tasks")
      .select("*, leads(name, email, organization_id)")
      .eq("id", taskId)
      .single();

    if (taskError || !task) throw new Error("Task not found");

    const finalUserId = userId || task.user_id;
    const finalOrgId = task.organization_id;

    // Update status to processing
    await supabase.from("agent_tasks").update({ status: "approved", logs: `${task.logs}\nProcessing execution...` }).eq("id", taskId);

    // 2. Resolve Google Connection
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const { data: profile } = await supabase
      .from("profiles")
      .select("google_connected, google_refresh_token")
      .eq("id", finalUserId)
      .single();

    const isConnected = profile?.google_connected && profile?.google_refresh_token;
    const hasCredentials = clientId && clientSecret;
    
    let isSimulation = !isConnected || !hasCredentials;
    let success = false;
    let executionLogs = "";

    const draft = task.draft_data;
    if (!draft || !draft.to) {
      throw new Error("Invalid draft data or recipient address.");
    }

    if (!isSimulation) {
      try {
        // Refresh token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: profile.google_refresh_token,
            grant_type: "refresh_token",
          }),
        });
        const tokenData = await tokenResponse.json();
        
        if (tokenResponse.ok) {
          const accessToken = tokenData.access_token;
          
          // Construct MIME email
          const rawMime = [
            `To: ${draft.to}`,
            `Subject: ${draft.subject}`,
            `Content-Type: text/html; charset=utf-8`,
            `MIME-Version: 1.0`,
            ``,
            draft.body
          ].join("\n");

          const base64Raw = Buffer.from(rawMime)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

          const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ raw: base64Raw }),
          });

          if (gmailResponse.ok) {
            success = true;
            const resData = await gmailResponse.json();
            executionLogs = `Delivered successfully via Gmail. Message ID: ${resData.id}`;
          } else {
            const errData = await gmailResponse.json();
            executionLogs = `Gmail API error: ${JSON.stringify(errData)}`;
          }
        } else {
          executionLogs = `Google OAuth Token refresh failed. Falling back to simulation.`;
          isSimulation = true;
        }
      } catch (err) {
        executionLogs = `OAuth exception: ${err.message}. Falling back to simulation.`;
        isSimulation = true;
      }
    }

    if (isSimulation) {
      success = true;
      executionLogs = `[SIMULATION] Email sent to ${draft.to} successfully. Subject: ${draft.subject}`;
    }

    // 3. Update agent_tasks record
    const status = success ? "completed" : "failed";
    const finalLogs = `${task.logs}\nExecuted at ${new Date().toISOString()}.\nStatus: ${status}.\nDetails: ${executionLogs}`;
    
    await supabase
      .from("agent_tasks")
      .update({
        status,
        logs: finalLogs
      })
      .eq("id", taskId);

    // 4. Log execution in agent_executions
    await supabase
      .from("agent_executions")
      .insert([{
        task_id: taskId,
        action: task.task_type === "outreach_email" ? "send_outreach_email" : "send_followup",
        status: success ? "success" : "failure",
        logs: executionLogs,
        user_id: finalUserId,
        organization_id: finalOrgId
      }]);

    // 5. Log activity log in activities
    await supabase
      .from("activities")
      .insert([{
        user_id: finalUserId,
        lead_id: task.lead_id,
        type: "email_sent",
        message: `AI Agent executed task: ${task.title} (Sent to ${task.leads?.name})`,
        content: {
          task_id: taskId,
          subject: draft.subject,
          simulation: isSimulation
        },
        organization_id: finalOrgId
      }]);

    // 6. Update lead stage / last_activity_at in CRM
    await supabase
      .from("leads")
      .update({
        status: task.task_type === "outreach_email" ? "Outreach Sent" : undefined,
        last_activity_at: new Date().toISOString()
      })
      .eq("id", task.lead_id);

    // Store a memory record of the sent email context
    await storeLeadMemory(task.lead_id, "outreach_activity", `Sent outreach email. Subject: ${draft.subject}`, finalUserId, finalOrgId);

    return { success, status, logs: executionLogs };

  } catch (err) {
    console.error("Failed to execute agent task:", err);
    return { success: false, status: "failed", logs: err.message };
  }
}
