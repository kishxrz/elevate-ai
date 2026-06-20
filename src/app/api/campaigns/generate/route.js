import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { checkRoutePermission } from "@/lib/rbacServer";

export async function POST(request) {
  try {
    const { goal, audience, offer, tone, organizationId } = await request.json();

    if (!goal || !audience || !offer || !tone || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: goal, audience, offer, tone, and organizationId are all required." },
        { status: 400 }
      );
    }

    // Restore Supabase user session
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;
    const rt = cookieStore.get("sb-refresh-token")?.value;

    let userId = null;
    if (token) {
      const { data: authData, error: authError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: rt || "",
      });
      if (!authError) {
        userId = authData.user?.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    // Verify permission: CREATE_CAMPAIGNS
    const isAllowed = await checkRoutePermission(userId, organizationId, "create_campaigns");
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to create campaigns in this organization." },
        { status: 403 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured on the server." }, { status: 500 });
    }

    // Initialize Gemini Client
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert sales outreach copywriter. Write a high-converting, personalized outbound email campaign template.
Campaign Details:
- Campaign Goal/Objective: ${goal}
- Target Audience: ${audience}
- Core Offer/Value Proposition: ${offer}
- Writing Tone: ${tone}

Please generate:
1. A compelling, high-open-rate subject line.
2. A professional HTML email body containing:
   - A personalized greeting placeholder (use {{name}} for lead name, and {{company}} for company name, e.g. "Hi {{name}}" or "Hope things are going well at {{company}}")
   - A persuasive value pitch based on the offer
   - A clear, strong call-to-action (CTA)
   - Professional spacing (use standard HTML tags like <p>, <br>, <strong>; do NOT include outer <html>, <head>, or <body> tags).

Respond ONLY with a JSON object in this exact format:
{
  "subject": "string",
  "body": "string"
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
            body: { type: "STRING" }
          },
          required: ["subject", "body"]
        }
      }
    });

    const aiResult = JSON.parse(response.text.trim());

    return NextResponse.json({
      success: true,
      data: {
        subject: aiResult.subject,
        body: aiResult.body
      }
    });
  } catch (err) {
    console.error("Error in campaigns generate API route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
