import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { checkRoutePermission } from "@/lib/rbacServer";

export async function POST(request) {
  try {
    const { name, goal, organizationId } = await request.json();
    if (!name || !goal || !organizationId) {
      return NextResponse.json({ error: "Name, goal, and organizationId parameters are required." }, { status: 400 });
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
        console.error("Failed to restore Supabase session in generate-sequence:", authError);
      } else {
        userId = authData.user?.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const isAllowed = await checkRoutePermission(userId, organizationId, "create_campaigns");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to generate outreach sequences in this workspace." }, { status: 403 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured on the server." }, { status: 500 });
    }

    // Initialize Gemini client
    const ai = new GoogleGenAI({ apiKey });

    // Construct sequence prompt
    const prompt = `You are a professional sales growth strategist. Generate a multi-step outbound sales outreach sequence based on this description:
Sequence Name: ${name}
Target Campaign Goal: ${goal}

Generate a sequence containing between 3 to 5 logical steps, spaced over days (e.g. Day 1, Day 3, Day 7, Day 14).
For each step, determine if Email or WhatsApp is the most effective channel. Provide complete, professional, and engaging copy templates (you can use placeholders like [Prospect Name], [Company Name], etc. in the content).

Respond ONLY with a JSON array in the exact format shown below, with no surrounding text:
[
  {
    "day": 1,
    "type": "email",
    "content": "Subject: ...\\n\\nDear [Prospect Name], ..."
  },
  {
    "day": 3,
    "type": "whatsapp",
    "content": "Hi [Prospect Name]! ..."
  }
]`;

    // Invoke Gemini model
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
              day: { type: "INTEGER" },
              type: { type: "STRING", enum: ["email", "whatsapp"] },
              content: { type: "STRING" }
            },
            required: ["day", "type", "content"]
          }
        }
      }
    });

    const steps = JSON.parse(response.text.trim());

    // Save sequence to Supabase outreach_sequences table
    const { data: sequence, error: saveError } = await supabase
      .from("outreach_sequences")
      .insert([{
        name,
        steps,
        active: true,
        user_id: userId,
        organization_id: organizationId
      }])
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save outreach sequence in database:", saveError);
      return NextResponse.json({ error: "Failed to save sequence in database." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sequence
    });

  } catch (err) {
    console.error("Error in generate-sequence API route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
