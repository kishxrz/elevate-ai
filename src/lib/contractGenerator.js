import { supabase } from "./supabase";
import { GoogleGenAI } from "@google/genai";

/**
 * Generates a legal contract for a deal using Gemini and saves it to the database.
 * @param {string} dealId 
 */
export async function generateContract(dealId) {
  if (!dealId) throw new Error("dealId is required");

  // 1. Fetch deal and lead details
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("*, leads!deals_lead_id_fkey(*)")
    .eq("id", dealId)
    .is("deleted_at", null)
    .single();

  if (dealError || !deal) {
    throw new Error("Deal not found: " + (dealError?.message || ""));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured on the server.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a corporate legal counsel. Generate a legally robust, binding Service Agreement Contract for:
Deal Title: ${deal.title || "Untitled Deal"}
Contract Value: $${deal.value || 0}
Client Representative: ${deal.leads?.name || "Client"}
Company Name: ${deal.leads?.company || "Not provided"}
Industry context: ${deal.leads?.industry || "Not provided"}

Please generate a professional, detailed contract containing formal legal clauses structured as follows:
1. Service Agreement Introduction & Parties
2. Payment Terms & Billing Schedule
3. Scope of Responsibilities & Support Level
4. Deliverables & Acceptance Criteria
5. Termination Clause, Liability Limits & Governing Law

Respond ONLY with a JSON object in this format:
{
  "content": "Full markdown text of the legal contract containing all required sections"
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          content: { type: "STRING" }
        },
        required: ["content"]
      }
    }
  });

  const parsed = JSON.parse(response.text.trim());
  const contractContent = parsed.content || "# Service Agreement\nPending drafting.";

  // Save contract to the database
  const { data: contract, error: insertError } = await supabase
    .from("contracts")
    .insert([{
      deal_id: dealId,
      contract_content: contractContent,
      status: "draft",
      signed: false,
      signed_at: null,
      organization_id: deal.organization_id || null
    }])
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  // Create log in deal_activities
  await supabase
    .from("deal_activities")
    .insert([{
      deal_id: dealId,
      activity_type: "Negotiation",
      description: `AI Contract drafted: Service Agreement for ${deal.leads?.company || deal.leads?.name || deal.title}`,
      organization_id: deal.organization_id || null
    }]);

  return contract;
}
