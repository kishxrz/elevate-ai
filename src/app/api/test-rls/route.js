import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;
    const rt = cookieStore.get("sb-refresh-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "No access token cookie found" });
    }

    const { data: sessionData, error: authError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: rt || "",
    });

    if (authError) {
      return NextResponse.json({ error: "Failed to restore session", details: authError });
    }

    const user = sessionData.user;

    // Test 1: Fetch profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    // Test 2: Fetch organizations
    const { data: orgs, error: orgsErr } = await supabase
      .from("organizations")
      .select("*");

    // Test 3: Fetch memberships
    const { data: memberships, error: membershipsErr } = await supabase
      .from("organization_members")
      .select("*");

    // Test 4: Call is_org_member RPC directly
    let rpcResult = null;
    let rpcResultErr = null;
    if (memberships && memberships.length > 0) {
      const targetOrgId = memberships[0].organization_id;
      const { data, error } = await supabase
        .rpc("is_org_member", { org_id: targetOrgId });
      rpcResult = data;
      rpcResultErr = error;
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile,
      profileErr,
      orgs,
      orgsErr,
      memberships,
      membershipsErr,
      rpcResult,
      rpcResultErr,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message });
  }
}
