import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;
    const rt = cookieStore.get("sb-refresh-token")?.value;

    let userSession = null;
    if (token) {
      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: rt || "",
      });
      if (!error) {
        userSession = data.user;
      }
    }

    const { data: orgs } = await supabase.from("organizations").select("*");
    const { data: members } = await supabase.from("organization_members").select("*");
    const { data: leads } = await supabase.from("leads").select("id, name, email, priority, nurture_status, score, organization_id");
    const { data: deals } = await supabase.from("deals").select("*");
    const { data: activities } = await supabase.from("activities").select("*");
    const { data: sequences } = await supabase.from("followup_sequences").select("*");
    const { data: steps } = await supabase.from("followup_steps").select("*");
    const { data: executions } = await supabase.from("followup_executions").select("*").order("created_at", { ascending: false });

    return NextResponse.json({
      userSession: userSession ? { id: userSession.id, email: userSession.email } : null,
      organizations: orgs || [],
      organization_members: members || [],
      leads: leads || [],
      deals: deals || [],
      activities: (activities || []).slice(0, 10),
      followup_sequences: sequences || [],
      followup_steps: steps || [],
      followup_executions: executions || []
    });
  } catch (err) {
    return NextResponse.json({ error: err.message });
  }
}
