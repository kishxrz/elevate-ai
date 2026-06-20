import { NextResponse } from "next/server";
import { executeAgentTask } from "@/lib/agentEngine";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { checkRoutePermission } from "@/lib/rbacServer";

export async function POST(request) {
  try {
    const { taskId } = await request.json();
    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
    }

    // Restore user session for Supabase client
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
        console.error("Failed to restore Supabase session in api/agent/execute:", authError);
      } else {
        userId = authData.user?.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // Fetch the task details to get the organization ID
    const { data: task, error: taskErr } = await supabase
      .from("agent_tasks")
      .select("organization_id")
      .eq("id", taskId)
      .single();

    if (taskErr || !task) {
      return NextResponse.json({ error: "Agent task not found." }, { status: 404 });
    }

    const organizationId = task.organization_id;
    const isAllowed = await checkRoutePermission(userId, organizationId, "execute_agent_tasks");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to execute AI agent tasks in this workspace." }, { status: 403 });
    }

    console.log(`[Agent execute API] Executing task ${taskId} for user ${userId}`);

    // Call server-side execution loop
    const result = await executeAgentTask(taskId, userId);

    return NextResponse.json(result);

  } catch (err) {
    console.error("Error executing agent task via API:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
