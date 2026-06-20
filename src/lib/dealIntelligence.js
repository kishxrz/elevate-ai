import { supabase } from "./supabase";
import { GoogleGenAI } from "@google/genai";

/**
 * Synchronous deal health evaluation using business heuristics.
 * Serves as a fallback or fast path if Gemini API is unavailable.
 */
export function evaluateDealHealthSync(deal) {
  if (!deal) {
    return {
      closeProbability: 0,
      riskLevel: "High",
      nextAction: "Create a deal profile to get started",
      forecastValue: 0
    };
  }

  const value = Number(deal.value) || 0;
  
  // 1. Lead Score contribution (default: 40 if not provided)
  const leadScore = Number(deal.leads?.score || deal.leads?.ai_score || 40);
  let prob = leadScore;

  // 2. Nurture status adjustments
  const nurture = deal.leads?.nurture_status || "Cold";
  if (nurture === "Hot") prob += 15;
  else if (nurture === "Warm") prob += 5;
  else if (nurture === "At Risk") prob -= 20;
  else if (nurture === "Cold") prob -= 5;

  // 3. Stage-based adjustments
  const stage = deal.stage || "Qualified";
  if (stage === "Won" || deal.status === "won") prob = 100;
  else if (stage === "Lost" || deal.status === "lost") prob = 0;
  else if (stage === "Negotiation") prob += 20;
  else if (stage === "Proposal Sent") prob += 10;
  else if (stage === "Discovery") prob += 5;

  // Clamp probability between 5% and 98% for open deals
  if (stage !== "Won" && stage !== "Lost" && deal.status !== "won" && deal.status !== "lost") {
    prob = Math.min(Math.max(prob, 5), 98);
  }

  // 4. Determine Risk Level
  let riskLevel = "Medium";
  if (prob >= 75) riskLevel = "Low";
  else if (prob < 40 || nurture === "At Risk") riskLevel = "High";

  // 5. Forecast Value Calculation
  const forecastValue = Math.round(value * (prob / 100));

  // Heuristic recommendations for next action
  let nextAction = "Schedule pricing discussion";
  if (stage === "Lead" || stage === "Qualified") {
    nextAction = "Schedule initial discovery call";
  } else if (stage === "Discovery") {
    nextAction = "Present custom scope & generate proposal";
  } else if (stage === "Proposal Sent") {
    nextAction = "Follow up on proposal terms & clarify questions";
  } else if (stage === "Negotiation") {
    nextAction = "Address pricing objection & generate final contract";
  } else if (stage === "Won") {
    nextAction = "Initiate client onboarding & kickoff call";
  } else if (stage === "Lost") {
    nextAction = "Schedule review to understand loss reasons";
  }

  return {
    closeProbability: Math.round(prob),
    riskLevel,
    nextAction,
    forecastValue
  };
}

/**
 * Evaluates deal health using Gemini if configured, otherwise falls back to heuristics.
 */
export async function evaluateDealHealth(deal) {
  const base = evaluateDealHealthSync(deal);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !deal) {
    return base;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an AI Revenue Intelligence mastermind. Evaluate the health of this B2B sales deal:
Deal: "${deal.title || "Untitled Deal"}"
Value: $${deal.value || 0}
Current Stage: ${deal.stage || "Qualified"}
Status: ${deal.status || "open"}
Notes: ${deal.notes || "None"}

Prospect Details:
- Lead Score: ${deal.leads?.score || deal.leads?.ai_score || "N/A"}
- Nurture Status: ${deal.leads?.nurture_status || "N/A"}
- Industry: ${deal.leads?.industry || "N/A"}

Please analyze these parameters and provide:
1. An updated close probability (0 to 100).
2. Risk level ("Low", "Medium", "High").
3. A highly actionable next action for the sales team (under 12 words).

Respond ONLY with a JSON object in this format:
{
  "closeProbability": number,
  "riskLevel": "Low" | "Medium" | "High",
  "nextAction": "string"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            closeProbability: { type: "INTEGER" },
            riskLevel: { type: "STRING", enum: ["Low", "Medium", "High"] },
            nextAction: { type: "STRING" }
          },
          required: ["closeProbability", "riskLevel", "nextAction"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    const closeProbability = Number(parsed.closeProbability) || base.closeProbability;
    
    return {
      closeProbability,
      riskLevel: parsed.riskLevel || base.riskLevel,
      nextAction: parsed.nextAction || base.nextAction,
      forecastValue: Math.round((Number(deal.value) || 0) * (closeProbability / 100))
    };
  } catch (err) {
    console.error("Gemini deal health evaluation failed, using heuristics:", err);
    return base;
  }
}

/**
 * Generate a smart next action suggestion.
 */
export async function recommendNextAction(deal) {
  const health = await evaluateDealHealth(deal);
  return health.nextAction;
}

/**
 * Calculations for Weighted Pipeline, Expected Revenue, Average Win Probability, Projected Revenue.
 * Gracefully handles empty datasets.
 */
export async function updateDealForecasts(userId, organizationId = null) {
  if (!userId) return null;

  try {
    // 1. Fetch all deals for this user/org
    let query = supabase
      .from("deals")
      .select("*, leads!deals_lead_id_fkey(*)")
      .is("deleted_at", null);

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    } else {
      query = query.eq("user_id", userId);
    }

    const { data: deals, error: dealsError } = await query;

    if (dealsError) throw dealsError;

    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    if (!deals || deals.length === 0) {
      // Empty dataset scenario: Save zero forecast
      const forecastPayload = {
        user_id: userId,
        organization_id: organizationId,
        forecast_month: currentMonth,
        forecast_value: 0,
        weighted_pipeline: 0,
        created_at: new Date().toISOString()
      };

      let checkQuery = supabase
        .from("revenue_forecasts")
        .select("id")
        .eq("forecast_month", currentMonth);

      if (organizationId) {
        checkQuery = checkQuery.eq("organization_id", organizationId);
      } else {
        checkQuery = checkQuery.eq("user_id", userId);
      }

      const { data: existing } = await checkQuery.maybeSingle();

      if (existing) {
        await supabase
          .from("revenue_forecasts")
          .update(forecastPayload)
          .eq("id", existing.id);
      } else {
        await supabase
          .from("revenue_forecasts")
          .insert([forecastPayload]);
      }

      return {
        totalPipeline: 0,
        weightedPipeline: 0,
        projectedRevenue: 0,
        averageWinProbability: 0
      };
    }

    // 2. Perform forecasting calculations
    let totalPipeline = 0;
    let weightedPipeline = 0;
    let wonValue = 0;
    let openDealsCount = 0;
    let sumProbability = 0;

    for (const deal of deals) {
      const health = evaluateDealHealthSync(deal);
      const val = Number(deal.value) || 0;

      // Persist the evaluated probability and risk level in the deals table
      await supabase
        .from("deals")
        .update({
          close_probability: health.closeProbability,
          risk_level: health.riskLevel
        })
        .eq("id", deal.id);

      if (deal.stage === "Won" || deal.status === "won") {
        wonValue += val;
      } else if (deal.stage !== "Lost" && deal.status !== "lost") {
        totalPipeline += val;
        weightedPipeline += val * (health.closeProbability / 100);
        sumProbability += health.closeProbability;
        openDealsCount++;
      }
    }

    const averageWinProbability = openDealsCount > 0 ? Math.round(sumProbability / openDealsCount) : 0;
    const expectedRevenue = weightedPipeline; // Expected monthly revenue is the weighted pipeline value
    const projectedRevenue = weightedPipeline + wonValue; // Expected + Won

    // 3. Store result in database
    const forecastPayload = {
      user_id: userId,
      organization_id: organizationId,
      forecast_month: currentMonth,
      forecast_value: projectedRevenue,
      weighted_pipeline: weightedPipeline,
      created_at: new Date().toISOString()
    };

    let checkQuery = supabase
      .from("revenue_forecasts")
      .select("id")
      .eq("forecast_month", currentMonth);

    if (organizationId) {
      checkQuery = checkQuery.eq("organization_id", organizationId);
    } else {
      checkQuery = checkQuery.eq("user_id", userId);
    }

    const { data: existing } = await checkQuery.maybeSingle();

    if (existing) {
      await supabase
        .from("revenue_forecasts")
        .update(forecastPayload)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("revenue_forecasts")
        .insert([forecastPayload]);
    }

    return {
      totalPipeline,
      weightedPipeline,
      projectedRevenue,
      averageWinProbability
    };
  } catch (err) {
    console.error("Failed to update deal forecasts:", err);
    throw err;
  }
}
