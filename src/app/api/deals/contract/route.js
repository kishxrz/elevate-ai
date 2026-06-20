import { NextResponse } from "next/server";
import { generateContract } from "@/lib/contractGenerator";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { checkRoutePermission } from "@/lib/rbacServer";

export async function POST(request) {
  try {
    const { dealId } = await request.json();
    if (!dealId) {
      return NextResponse.json({ error: "Deal ID is required" }, { status: 400 });
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
        console.error("Failed to restore Supabase session in contract API:", authError);
      } else {
        userId = authData.user?.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // Fetch deal organization ID
    const { data: deal, error: dealErr } = await supabase
      .from("deals")
      .select("organization_id")
      .eq("id", dealId)
      .single();

    if (dealErr || !deal) {
      return NextResponse.json({ error: "Deal not found or invalid deal ID." }, { status: 404 });
    }

    const organizationId = deal.organization_id;
    const isAllowed = await checkRoutePermission(userId, organizationId, "generate_contracts");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to generate contracts in this workspace." }, { status: 403 });
    }

    const contract = await generateContract(dealId);

    return NextResponse.json({
      success: true,
      contract
    });
  } catch (err) {
    console.error("Error in AI contract generation route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
