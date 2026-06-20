import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { checkRoutePermission } from "@/lib/rbacServer";

export async function POST(request) {
  try {
    const { userId, organizationId } = await request.json();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "User ID and Organization ID are required" }, { status: 400 });
    }

    // Restore user session for Supabase client to bypass RLS policy check
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;
    const rt = cookieStore.get("sb-refresh-token")?.value;

    let authUserId = null;
    if (token) {
      const { data: authData, error: authError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: rt || "",
      });
      if (authError) {
        console.error("Failed to restore Supabase session in generate-daily-tasks API:", authError);
      } else {
        authUserId = authData.user?.id;
      }
    }

    if (!authUserId || authUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized. Session does not match user ID." }, { status: 401 });
    }

    const isAllowed = await checkRoutePermission(authUserId, organizationId, "create_leads");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to generate tasks in this workspace." }, { status: 403 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured on the server." }, { status: 500 });
    }

    // 1. Fetch leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, name, company, value, score, priority, last_activity_at, status")
      .eq("organization_id", organizationId);

    if (leadsError) {
      console.error("Failed to fetch leads for task generation:", leadsError);
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }

    // 2. Fetch appointments
    const { data: appointments, error: aptsError } = await supabase
      .from("appointments")
      .select("id, lead_id, title, start_time, status")
      .eq("organization_id", organizationId)
      .gte("start_time", new Date().toISOString());

    // 3. Fetch recent followups
    const { data: followups, error: followupsError } = await supabase
      .from("followups")
      .select("id, lead_id, created_at, status")
      .eq("organization_id", organizationId);

    // 4. Initialize Google Gemini SDK
    const ai = new GoogleGenAI({ apiKey });

    // Format current date
    const todayStr = new Date().toISOString().split("T")[0];

    const prompt = `You are an AI Daily Sales Task Generator. Your task is to review the current sales pipeline state and generate a list of actionable sales tasks for today (${todayStr}).

Here is the current pipeline state:
Leads:
${JSON.stringify(leads || [])}

Upcoming Appointments:
${JSON.stringify(appointments || [])}

Recent Follow-Ups:
${JSON.stringify(followups || [])}

Analyze this data to identify:
1. Hot leads (priority 'Hot' or score >= 80) that need immediate action.
2. Leads with upcoming appointments (need preparation or pitch drafting).
3. Leads with no recent activity (where last_activity_at is old, e.g. over 3 days, or null).
4. Pending followups that need status updates.

Generate up to 5 highly actionable tasks for today.
Each task should link to a lead if applicable (use the lead's "id" as lead_id).
Respond ONLY with a JSON array in this exact format:
[
  {
    "lead_id": "string (UUID or null)",
    "title": "string (clear, action-oriented title, e.g., 'Draft custom proposal for Amelia Thorne')",
    "description": "string (brief context and recommended action, under 40 words)",
    "priority": "High" | "Medium" | "Low",
    "due_date": "YYYY-MM-DD"
  }
]`;

    // 5. Invoke Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              lead_id: { type: "STRING" },
              title: { type: "STRING" },
              description: { type: "STRING" },
              priority: { type: "STRING", enum: ["High", "Medium", "Low"] },
              due_date: { type: "STRING" }
            },
            required: ["title", "description", "priority", "due_date"]
          }
        }
      }
    });

    const tasksList = JSON.parse(response.text.trim());

    // 6. Insert generated tasks into Supabase
    const tasksToInsert = tasksList.map(task => ({
      user_id: userId,
      lead_id: task.lead_id && task.lead_id !== "null" && task.lead_id !== "" ? task.lead_id : null,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.due_date || todayStr,
      status: "pending",
      organization_id: organizationId
    }));

    if (tasksToInsert.length > 0) {
      const { data: insertedTasks, error: insertError } = await supabase
        .from("tasks")
        .insert(tasksToInsert)
        .select();

      if (insertError) {
        console.error("Failed to insert tasks in database:", insertError);
        return NextResponse.json({ error: "Failed to save generated tasks in database" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        tasks: insertedTasks
      });
    }

    return NextResponse.json({
      success: true,
      tasks: []
    });

  } catch (err) {
    console.error("Error in generate-daily-tasks API route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
