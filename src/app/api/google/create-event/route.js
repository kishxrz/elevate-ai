import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";
import { calculateAndStoreLeadPriority } from "@/lib/leadScoring";
import { cookies } from "next/headers";
import { checkRoutePermission } from "@/lib/rbacServer";

export async function POST(request) {
  try {
    const { leadId, userId, title, startTime, endTime, description } = await request.json();

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
        console.error("Failed to restore Supabase session in google/create-event API:", authError);
      } else {
        authUserId = authData.user?.id;
      }
    }

    if (!authUserId || authUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized. Session does not match user ID." }, { status: 401 });
    }

    if (!leadId || !userId || !title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required parameters: leadId, userId, title, startTime, endTime are required." },
        { status: 400 }
      );
    }

    // Fetch lead details to get organization ID, name and email
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("name, email, organization_id")
      .eq("id", leadId)
      .single();

    if (leadErr || !lead) {
      console.error("Failed to fetch lead details for event:", leadErr);
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const organizationId = lead.organization_id;
    const isAllowed = await checkRoutePermission(authUserId, organizationId, "book_meetings");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to book meetings in this workspace." }, { status: 403 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // 1. Fetch user's Google credentials from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("google_connected, google_refresh_token")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Failed to fetch user profile connections:", profileError);
    }

    const hasCredentials = clientId && clientSecret;
    const isConnected = profile?.google_connected && profile?.google_refresh_token;

    // 2. CHECK IF WE SHOULD RUN IN SIMULATION MODE
    if (!hasCredentials || !isConnected) {
      console.log(`[Google Calendar] Running in Simulation Mode (Credentials configured: ${!!hasCredentials}, Connected: ${!!isConnected})`);
      
      const simEventId = `gcal_sim_${Date.now()}`;
      // Generate a realistic Google Meet URL
      const chars = "abcdefghijklmnopqrstuvwxyz";
      const p1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const p3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const simMeetLink = `https://meet.google.com/${p1}-${p2}-${p3}`;

      // Insert appointment record into Supabase
      const { data: appointment, error: aptError } = await supabase
        .from("appointments")
        .insert([{
          user_id: userId,
          lead_id: leadId,
          event_id: simEventId,
          meet_link: simMeetLink,
          title,
          description: description || "Strategy consultation session.",
          start_time: startTime,
          end_time: endTime,
          status: "upcoming",
          organization_id: lead.organization_id || null
        }])
        .select()
        .single();

      if (aptError) {
        console.error("Failed to insert simulated appointment:", aptError);
        return NextResponse.json({ error: "Failed to save simulated appointment in database." }, { status: 500 });
      }

      // Update lead status to Appointment Booked
      const { error: updateError } = await supabase
        .from("leads")
        .update({ status: "Appointment Booked" })
        .eq("id", leadId);

      if (updateError) {
        console.error("Failed to update lead stage after booking:", updateError);
      }

      // Generate Appointment Intelligence and recalculate priority
      await runAppointmentIntelligenceAndScoring(appointment, leadId);

      return NextResponse.json({
        success: true,
        simulation: true,
        appointment,
      });
    }

    // 3. LIVE GOOGLE CALENDAR API INTEGRATION
    console.log(`[Google Calendar] Refreshing token & creating live event for user: ${userId}`);

    // Exchange refresh token for an access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: profile.google_refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Failed to refresh Google access token:", tokenData);
      return NextResponse.json(
        { error: "Google OAuth refresh failed. Please reconnect Google Calendar in Integrations." },
        { status: 401 }
      );
    }

    const accessToken = tokenData.access_token;
    const gcalUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1";

    // Call Google Calendar API to create the event with dynamic Google Meet links
    const gcalResponse = await fetch(gcalUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: title,
        description: description || `Consultation session for prospect ${lead.name}`,
        start: {
          dateTime: startTime,
        },
        end: {
          dateTime: endTime,
        },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
        attendees: [
          { email: lead.email, displayName: lead.name }
        ],
      }),
    });

    const eventData = await gcalResponse.json();

    if (!gcalResponse.ok) {
      console.error("Failed to create Google Calendar event:", eventData);
      return NextResponse.json({ error: "Failed to create Google Calendar event." }, { status: 502 });
    }

    // Extract the Google Meet link from response conference data
    let meetLink = "";
    if (eventData.conferenceData?.entryPoints) {
      const videoEntry = eventData.conferenceData.entryPoints.find((ep) => ep.entryPointType === "video");
      if (videoEntry) {
        meetLink = videoEntry.uri;
      }
    }

    // Fallback if conference Meet link didn't generate (e.g. scope missing, or organization policies)
    if (!meetLink) {
      meetLink = eventData.htmlLink || `https://calendar.google.com/calendar/r/eventedit/${eventData.id}`;
    }

    // Insert live appointment record into Supabase
    const { data: appointment, error: aptError } = await supabase
      .from("appointments")
      .insert([{
        user_id: userId,
        lead_id: leadId,
        event_id: eventData.id,
        meet_link: meetLink,
        title,
        description: description || "Strategy consultation session.",
        start_time: startTime,
        end_time: endTime,
        status: "upcoming",
        organization_id: lead.organization_id || null
      }])
      .select()
      .single();

    if (aptError) {
      console.error("Failed to save live appointment in database:", aptError);
      return NextResponse.json({ error: "Failed to save appointment in database." }, { status: 500 });
    }

    // Update lead status to Appointment Booked
    const { error: updateError } = await supabase
      .from("leads")
      .update({ status: "Appointment Booked" })
      .eq("id", leadId);

    if (updateError) {
      console.error("Failed to update lead stage after booking:", updateError);
    }

    // Generate Appointment Intelligence and recalculate priority
    await runAppointmentIntelligenceAndScoring(appointment, leadId);

    return NextResponse.json({
      success: true,
      simulation: false,
      appointment,
    });
  } catch (err) {
    console.error("Unexpected error in Google create-event handler:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

async function runAppointmentIntelligenceAndScoring(appointment, leadId) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("Gemini API key not configured. Skipping appointment intelligence.");
      await calculateAndStoreLeadPriority(leadId);
      return;
    }

    // 1. Fetch lead details
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      console.error("Failed to fetch lead for appointment intelligence:", leadError);
      return;
    }

    // 2. Initialize Google Gemini SDK
    const ai = new GoogleGenAI({ apiKey });

    // 3. Construct prompt
    const prompt = `You are an AI Sales Prep Assistant. Review these details of a prospect and their newly scheduled appointment:
Prospect Info:
Name: ${lead.name}
Company: ${lead.company || "Not provided"}
Industry: ${lead.industry}
AI Summary: ${lead.ai_summary || "No qualification notes yet"}
Notes: ${lead.notes || "None"}

Appointment Info:
Title: ${appointment.title}
Time: ${appointment.start_time}
Description: ${appointment.description || "None"}

Generate:
1. meeting_brief: A brief summary of what the meeting is about.
2. recommended_pitch: The best sales pitch to focus on.
3. pain_points: The key pain points this lead likely has.
4. expected_questions: Objections or questions the lead is likely to raise.
5. recommended_offer: The best tier or services to offer them.

Respond ONLY with a JSON object in this format:
{
  "meeting_brief": "string",
  "recommended_pitch": "string",
  "pain_points": "string",
  "expected_questions": "string",
  "recommended_offer": "string"
}`;

    // 4. Generate Content via Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            meeting_brief: { type: "STRING" },
            recommended_pitch: { type: "STRING" },
            pain_points: { type: "STRING" },
            expected_questions: { type: "STRING" },
            recommended_offer: { type: "STRING" }
          },
          required: ["meeting_brief", "recommended_pitch", "pain_points", "expected_questions", "recommended_offer"]
        }
      }
    });

    const aiResult = JSON.parse(response.text.trim());

    // 5. Store meeting brief inside activities table
    const { error: insertError } = await supabase
      .from("activities")
      .insert([{
        lead_id: leadId,
        user_id: appointment.user_id,
        type: "meeting_brief",
        message: `AI pre-meeting brief prepared for appointment with ${lead.name}`,
        content: aiResult,
        organization_id: lead.organization_id || null
      }]);

    if (insertError) {
      console.error("Failed to insert meeting brief activity:", insertError);
    }

    // 6. Recalculate lead priority & update last_activity_at
    await calculateAndStoreLeadPriority(leadId);

  } catch (err) {
    console.error("Error in runAppointmentIntelligenceAndScoring:", err);
    try {
      await calculateAndStoreLeadPriority(leadId);
    } catch (_) {}
  }
}
