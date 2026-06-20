import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { calculateAndStoreLeadPriority } from "@/lib/leadScoring";

export async function POST(request) {
  try {
    const { leadId } = await request.json();

    // Restore user session for Supabase client to bypass RLS policy check
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;
    const rt = cookieStore.get("sb-refresh-token")?.value;

    if (token) {
      console.log("[Qualify API] Restoring session with token length:", token.length);
      const { data: { user }, error: authError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: rt || "",
      });
      if (authError) {
        console.error("[Qualify API] Failed to restore Supabase session:", authError);
      } else {
        console.log("[Qualify API] Restored session for user:", user?.email, "ID:", user?.id);
      }
    } else {
      console.warn("[Qualify API] No sb-access-token cookie found in request headers!");
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    console.log("[Qualify API] Current active user on client:", currentUser ? currentUser.email : "ANONYMOUS");

    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured on the server." }, { status: 500 });
    }

    // 1. Fetch the lead details from Supabase
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (fetchError || !lead) {
      console.error("Failed to fetch lead for qualification:", fetchError);
      return NextResponse.json({ error: "Lead not found in database" }, { status: 404 });
    }

    // 2. Initialize Google Gemini SDK
    const ai = new GoogleGenAI({ apiKey });

    // 3. Construct prompt
    const prompt = `You are an AI Lead Qualification Assistant. Review the details of this new prospect:
Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone || "Not provided"}
Company: ${lead.company || "Not provided"}
Industry context: ${lead.industry}
Original Notes / Context: ${lead.notes || "None"}

Please evaluate this lead on target market fit, contact info completeness, and intent level.
Generate:
1. A quality score from 0 to 100.
2. A brief reasoning (under 80 words).
3. A recommended next action.

Respond ONLY with a JSON object in this format:
{
  "score": number,
  "reasoning": "string",
  "next_action": "string"
}`;

    // 4. Invoke Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            score: { type: "INTEGER" },
            reasoning: { type: "STRING" },
            next_action: { type: "STRING" }
          },
          required: ["score", "reasoning", "next_action"]
        }
      }
    });

    const aiResult = JSON.parse(response.text.trim());
    const score = Number(aiResult.score) || 0;
    const reasoning = aiResult.reasoning || "No reasoning provided.";
    const nextAction = aiResult.next_action || "No action recommended.";

    // 5. Update the notes field with the structured output while preserving original notes
    const originalNotes = lead.notes || "";
    // Clean up any previous AI evaluations if this is a re-run
    const cleanedOriginalNotes = originalNotes
      .replace(/\[AI Reason\]:[\s\S]*?(?=\n----------------------------------------|$)/g, "")
      .replace(/\[Next Action\]:[\s\S]*?(?=\n----------------------------------------|$)/g, "")
      .replace(/----------------------------------------\s*\n?\[Original Notes\]:\s*/g, "")
      .trim();

    const updatedNotes = `[AI Reason]: ${reasoning}
[Next Action]: ${nextAction}
----------------------------------------
[Original Notes]: ${cleanedOriginalNotes || "None"}`;

    // 6. Save the results back to Supabase
    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update({
        score: score,
        notes: updatedNotes,
        ai_score: score,
        ai_summary: reasoning,
        ai_status: score >= 80 ? "Hot" : score >= 50 ? "Warm" : "Cold",
        recommended_action: nextAction
      })
      .eq("id", leadId)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update lead with qualification results:", updateError);
      return NextResponse.json({ error: "Failed to save qualification results in database" }, { status: 500 });
    }

    // Recalculate priority and update nurture status
    await calculateAndStoreLeadPriority(leadId);

    return NextResponse.json({
      success: true,
      id: updatedLead.id,
      score: updatedLead.score,
      notes: updatedLead.notes
    });

  } catch (err) {
    console.error("Error in lead qualification route handler:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
