import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";
import { calculateAndStoreLeadPriority } from "@/lib/leadScoring";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const { leadId } = await request.json();
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    // Restore user session for Supabase client to bypass RLS policy check
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;
    const rt = cookieStore.get("sb-refresh-token")?.value;

    if (token) {
      const { error: authError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: rt || "",
      });
      if (authError) {
        console.error("Failed to restore Supabase session in generate-followup API:", authError);
      }
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
      console.error("Failed to fetch lead for follow-up generation:", fetchError);
      return NextResponse.json({ error: "Lead not found in database" }, { status: 404 });
    }

    // 2. Initialize Google Gemini SDK
    const ai = new GoogleGenAI({ apiKey });

    // 3. Construct the follow-up prompt
    const prompt = `You are an AI Sales Follow-Up Assistant. Analyze the details of this prospect:
Name: ${lead.name}
Company: ${lead.company || "Not provided"}
Email: ${lead.email}
Phone: ${lead.phone || "Not provided"}
AI Score: ${lead.ai_score !== null && lead.ai_score !== undefined ? lead.ai_score : (lead.score || 0)}
AI Summary: ${lead.ai_summary || "No summary available"}
Deal Value: $${lead.value || 0}
CRM Stage / Status: ${lead.status || "New Lead"}

Generate a highly personalized, conversion-focused follow-up package. It must contain:
1. A friendly, professional, and personalized WhatsApp message draft (using bold text format like *bold* where appropriate).
2. An email subject line.
3. A personalized email body in HTML format (use clean paragraphs, modern professional greetings).
4. A call script for a sales representative.
5. A specific recommended next action.

Respond ONLY with a JSON object in this format:
{
  "whatsapp_message": "string",
  "email_subject": "string",
  "email_body": "string",
  "call_script": "string",
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
            whatsapp_message: { type: "STRING" },
            email_subject: { type: "STRING" },
            email_body: { type: "STRING" },
            call_script: { type: "STRING" },
            next_action: { type: "STRING" }
          },
          required: ["whatsapp_message", "email_subject", "email_body", "call_script", "next_action"]
        }
      }
    });

    const aiResult = JSON.parse(response.text.trim());

    // 5. Store follow-up inside database
    const { data: followup, error: insertError } = await supabase
      .from("followups")
      .insert([{
        lead_id: leadId,
        user_id: lead.user_id,
        whatsapp_message: aiResult.whatsapp_message,
        email_subject: aiResult.email_subject,
        email_body: aiResult.email_body,
        call_script: aiResult.call_script,
        next_action: aiResult.next_action,
        status: "generated",
        organization_id: lead.organization_id || null
      }])
      .select()
      .single();

    if (insertError) {
      console.error("Failed to save follow-up in database:", insertError);
      return NextResponse.json({ error: "Failed to save follow-up in database" }, { status: 500 });
    }

    // 6. Log the activity in the activities table
    const { error: actError } = await supabase
      .from("activities")
      .insert([{
        lead_id: leadId,
        user_id: lead.user_id,
        type: "followup_generated",
        message: `AI follow-up package generated for ${lead.name}`,
        content: {
          followup_id: followup.id,
          next_action: aiResult.next_action
        },
        organization_id: lead.organization_id || null
      }]);

    if (actError) {
      console.error("Failed to create activity log for follow-up:", actError);
    }

    // 7. Trigger Priority and Score Recalculation (which updates last_activity_at)
    await calculateAndStoreLeadPriority(leadId);

    return NextResponse.json({
      success: true,
      followup
    });

  } catch (err) {
    console.error("Error in generate-followup API route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
