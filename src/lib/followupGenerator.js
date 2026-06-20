import { GoogleGenAI } from "@google/genai";

/**
 * Generates a highly personalized sales copy follow-up email.
 * 
 * @param {Object} lead - The CRM lead object
 * @param {Object|null} deal - Current deal associated with lead (if any)
 * @param {Array<Object>} previousEmails - History of prior sent emails in sequence
 * @param {string} memories - Historic CRM objection/pain point notes
 * @returns {Promise<{subject: string, body: string}>} Resolved subject and body templates
 */
export async function generateFollowupEmail(lead, deal = null, previousEmails = [], memories = "") {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("Gemini API key is not configured. Falling back to default copy.");
      return getFallbackCopy(lead, previousEmails);
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format previous emails summary for the prompt
    const prevEmailsContext = previousEmails.length > 0
      ? previousEmails.map((e, idx) => `Email #${idx + 1} (Sent: ${e.executed_at || e.created_at || 'date unknown'}):
Subject: ${e.email_subject}
Body: ${e.email_body || '(empty)'}`).join("\n---\n")
      : "No previous emails sent in this sequence yet.";

    const prompt = `You are a world-class, premium sales copywriter and AI outreach agent.
Analyze the following CRM prospect details and historical thread to write a highly compelling, context-aware, and ultra-personalized outbound follow-up email.

=== LEAD DETAILS ===
Name: ${lead.name}
Email: ${lead.email}
Company: ${lead.company || "Not provided"}
Industry: ${lead.industry || "Not provided"}
CRM Score: ${lead.score || 0}
Nurture Status: ${lead.nurture_status || "Warm"}
Notes/Qualifications: ${lead.ai_summary || lead.notes || "None"}

=== DEALS / PIPELINE ===
${deal ? `Deal: ${deal.name} | Stage: ${deal.stage} | Value: $${deal.value || 0} | Status: ${deal.status || 'open'}` : "No active deal associated."}

=== PROSPECT MEMORIES (PAIN POINTS & OBJECTIONS) ===
${memories || "None registered yet."}

=== OUTBOUND SEQUENCE HISTORY ===
${prevEmailsContext}

=== INSTRUCTIONS ===
1. Generate a personalized, highly relevant email Subject Line. Make it short, contextual, and curiosity-inducing. Avoid spammy sales words. If this is a subsequent follow-up, it can start with "Re:" or keep a fresh contextual hook.
2. Generate the email Body in HTML format (using clean paragraphs like <p>, spacing, no outer <html> or <body> tags, only standard tags like <p>, <br>, <strong>, <a>). Do not include signatures or placeholders (like [My Name]). Write as if you are the account manager or assistant.
3. Be conversational and value-first. Address their registered CRM memories, objections, or pain points directly. Keep the tone premium, helpful, professional, and slightly conversational.
4. Ensure the call to action (CTA) is clear, low-friction, and relevant.

Respond ONLY with a JSON object in this format:
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

    const result = JSON.parse(response.text.trim());
    return {
      subject: result.subject || `Outreach follow-up for ${lead.company || "your business"}`,
      body: result.body || `<p>Hi ${lead.name},</p><p>I wanted to follow up on my last email. Do you have a few minutes for a quick chat next week?</p>`
    };

  } catch (err) {
    console.error("Error generating followup email with Gemini:", err);
    return getFallbackCopy(lead, previousEmails);
  }
}

/**
 * Returns a fallback copy template.
 */
function getFallbackCopy(lead, previousEmails) {
  const stepCount = previousEmails.length;
  let subject = `Outreach regarding ${lead.company || "your business"}`;
  let body = `<p>Hi ${lead.name},</p><p>I wanted to check back in. Let me know if you have a few minutes to connect next week.</p>`;

  if (stepCount === 1) {
    subject = `Quick follow up for ${lead.name}`;
    body = `<p>Hi ${lead.name},</p><p>Just checking back to see if you received my previous email. I'd love to connect and share more about how we help companies in the ${lead.industry || 'sales'} space.</p>`;
  } else if (stepCount === 2) {
    subject = `Checklist for ${lead.company || 'your team'}`;
    body = `<p>Hi ${lead.name},</p><p>I wanted to send over a quick checklist of optimizations for CRM workflows. Let me know if you'd be interested in exploring this together.</p>`;
  } else if (stepCount >= 3) {
    subject = `Moving on — ${lead.name}`;
    body = `<p>Hi ${lead.name},</p><p>Since I haven't heard back, I'll assume timing isn't right. Let me know if you'd like to reconnect in the future.</p>`;
  }

  return { subject, body };
}
