import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { checkRoutePermission } from "@/lib/rbacServer";

export async function POST(request) {
  try {
    const { leadIds, campaignGoal } = await request.json();
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "Lead IDs array is required and cannot be empty." }, { status: 400 });
    }
    if (!campaignGoal) {
      return NextResponse.json({ error: "Campaign goal is required." }, { status: 400 });
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
        console.error("Failed to restore Supabase session in generate-campaign:", authError);
      } else {
        userId = authData.user?.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured on the server." }, { status: 500 });
    }

    // 1. Fetch leads from database
    const { data: leads, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .in("id", leadIds);

    if (fetchError || !leads || leads.length === 0) {
      console.error("Failed to fetch leads for campaign generation:", fetchError);
      return NextResponse.json({ error: "Leads not found in database" }, { status: 404 });
    }

    const organizationId = leads[0].organization_id;
    const isAllowed = await checkRoutePermission(userId, organizationId, "create_campaigns");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to generate campaigns in this workspace." }, { status: 403 });
    }

    // 2. Initialize Gemini Client
    const ai = new GoogleGenAI({ apiKey });

    // 3. Generate personalized emails in parallel
    const emailPromises = leads.map(async (lead) => {
      try {
        const prompt = `You are a professional sales outreach copywriter. Create a highly personalized sales email for the prospect below.
Lead Name: ${lead.name}
Company: ${lead.company || "Not provided"}
Industry Context: ${lead.industry}
AI Summary: ${lead.ai_summary || "No qualification notes yet"}
Original Notes: ${lead.notes || "None"}
Lead Value: $${lead.value || 0}
CRM status: ${lead.status || "New Lead"}

Campaign Goal: ${campaignGoal}

Please generate:
1. subject: A short, high-open-rate subject line.
2. body: A personalized email body in HTML format (using clean paragraphs like <p>, spacing, no outer <html> or <body> tags, only standard tags like <p>, <br>, <strong>).
3. cta: A specific call to action (CTA).
4. booking_hook: A natural appointment booking hook designed to schedule a consultation.

Respond ONLY with a JSON object in this format:
{
  "subject": "string",
  "body": "string",
  "cta": "string",
  "booking_hook": "string"
}`;

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
                cta: { type: "STRING" },
                booking_hook: { type: "STRING" }
              },
              required: ["subject", "body", "cta", "booking_hook"]
            }
          }
        });

        const aiResult = JSON.parse(response.text.trim());
        return {
          leadId: lead.id,
          leadName: lead.name,
          leadEmail: lead.email,
          subject: aiResult.subject,
          body: aiResult.body,
          cta: aiResult.cta,
          bookingHook: aiResult.booking_hook
        };
      } catch (err) {
        console.error(`Failed to generate email for lead ${lead.id}:`, err);
        return {
          leadId: lead.id,
          leadName: lead.name,
          leadEmail: lead.email,
          subject: `Outreach regarding ${lead.company || "your business"}`,
          body: `<p>Hi ${lead.name},</p><p>I wanted to connect to explore how we can support you. Let me know when you have some time to chat.</p>`,
          cta: "Reply to this email",
          bookingHook: "Would you be open to a quick 10-minute chat next week?",
          error: true
        };
      }
    });

    const generatedEmails = await Promise.all(emailPromises);

    return NextResponse.json({ emails: generatedEmails });
  } catch (err) {
    console.error("Error in generate-campaign route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
