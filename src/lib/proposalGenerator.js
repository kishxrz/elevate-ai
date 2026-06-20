import { supabase } from "./supabase";
import { GoogleGenAI } from "@google/genai";

/**
 * Generates an executive proposal for a deal using Gemini and saves it to the database.
 * @param {string} dealId 
 */
export async function generateProposal(dealId) {
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

  const prompt = `You are a staff enterprise sales consultant and proposal designer. Write a highly professional, comprehensive business proposal for:
Deal Title: ${deal.title || "Untitled Deal"}
Expected Deal Value: $${deal.value || 0}
Target Customer: ${deal.leads?.name || "Client"}
Company Name: ${deal.leads?.company || "Not provided"}
Industry: ${deal.leads?.industry || "Not provided"}
Background / Opportunity Notes: ${deal.notes || "None"}

Please compose a premium business proposal written in formal Markdown, containing the following structured sections:
1. Executive Summary
2. Business Goals
3. Service Scope
4. Deliverables
5. Timeline
6. Pricing
7. Expected ROI
8. Terms & Conditions

Respond ONLY with a JSON object in this format:
{
  "title": "A compelling, custom proposal title",
  "content": "Full markdown proposal text containing all required sections"
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          content: { type: "STRING" }
        },
        required: ["title", "content"]
      }
    }
  });

  const parsed = JSON.parse(response.text.trim());
  const proposalTitle = parsed.title || `Proposal for ${deal.leads?.company || deal.leads?.name || deal.title}`;
  const proposalContent = parsed.content || "# Proposal Details\nPending generation.";

  // Fetch highest version to increment
  const { data: existingProposals } = await supabase
    .from("proposals")
    .select("proposal_version")
    .eq("deal_id", dealId)
    .order("proposal_version", { ascending: false });
  
  const nextVersion = existingProposals && existingProposals.length > 0 
    ? (Number(existingProposals[0].proposal_version) || 1) + 1 
    : 1;

  // Save proposal to the database
  const { data: proposal, error: insertError } = await supabase
    .from("proposals")
    .insert([{
      deal_id: dealId,
      proposal_title: proposalTitle,
      proposal_content: proposalContent,
      status: "draft",
      proposal_version: nextVersion,
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
      activity_type: "Proposal Sent",
      description: `AI Proposal drafted (v${nextVersion}): "${proposalTitle}"`,
      organization_id: deal.organization_id || null
    }]);

  return proposal;
}
