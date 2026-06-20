import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { queueApprovalRequiredTask } from "@/lib/agentEngine";
import { generateProposal } from "@/lib/proposalGenerator";
import { generateContract } from "@/lib/contractGenerator";
import { updateDealForecasts } from "@/lib/dealIntelligence";
import { checkRoutePermission } from "@/lib/rbacServer";

export async function POST(request) {
  try {
    const { command, organizationId } = await request.json();
    if (!command || !command.trim()) {
      return NextResponse.json({ error: "Command string is required." }, { status: 400 });
    }
    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required." }, { status: 400 });
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
        console.error("Failed to restore Supabase session in api/agent/command:", authError);
      } else {
        userId = authData.user?.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const isAllowed = await checkRoutePermission(userId, organizationId, "run_ai_agent");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to run AI agent commands in this workspace." }, { status: 403 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured on the server." }, { status: 500 });
    }

    // 1. Fetch CRM Leads context
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, name, email, company, value, score, priority, status, nurture_status, organization_id, owner_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (leadsError) {
      console.error("Failed to fetch leads context for agent command:", leadsError);
    }

    // 2. Fetch CRM Deals context for Phase 8
    const { data: deals, error: dealsError } = await supabase
      .from("deals")
      .select("*, leads!deals_lead_id_fkey(*)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (dealsError) {
      console.error("Failed to fetch deals context for agent command:", dealsError);
    }

    // 3. Initialize Gemini Client
    const ai = new GoogleGenAI({ apiKey });

    // 4. Construct natural language execution prompt
    const prompt = `You are the executive mastermind interface of Elevate AI CRM. You translate natural language user commands into structured actions.
Current context:
- User ID: ${userId}
- Total CRM Leads: ${(leads || []).length}
- Leads Summary: ${JSON.stringify(leads || [])}
- Total CRM Deals: ${(deals || []).length}
- Deals Summary: ${JSON.stringify(deals || []).substring(0, 4000)}

Available Actions:
1. "filter_leads": Query and display leads matching criteria (e.g. show hot leads, list real estate leads).
   Parameters: status (string, optional), priority (string, optional), minScore (integer, optional), industry (string, optional).
2. "send_followups": Queue pending-approval follow-up tasks for specific leads (e.g. send followups to all at-risk leads).
   Parameters: target (string, e.g. "at_risk" or "hot" or "all_pending").
3. "create_campaign": Automatically launch a personalized campaign generator draft.
   Parameters: name (string), industry (string), goal (string).
4. "generate_forecast": Generate closing probability, projected revenue, and closing stats.
   Parameters: none.
5. "show_open_deals": Display open/active deals.
   Parameters: none.
6. "create_proposal": Create proposal. Search the deals context list for a deal linked to the requested client (e.g., Rajesh Export). Use its ID for dealId parameter.
   Parameters: dealId (string).
7. "generate_contract": Generate service contract. Search the deals context list for a deal matching title/ID (e.g., Deal #123, or Rajesh Export deal). Use its ID for dealId parameter.
   Parameters: dealId (string).
8. "show_forecast_revenue": Show expectation weighted/projected pipeline forecast revenue.
   Parameters: none.
9. "show_risky_deals": Show deals with High risk level.
   Parameters: none.
10. "show_deals_closing_this_month": Show deals expected to close in the current month.
    Parameters: none.
11. "update_deal_stage": Update deal stage. Resolve requested client/deal to a deal ID, and specify stage. If "Mark deal won", stage is "Won". If "Mark deal lost", stage is "Lost".
    Parameters: dealId (string), stage (string, e.g. "Negotiation", "Won", "Lost").
12. "unknown": Use this if the command doesn't match any system capabilities or intent.

User Command: "${command}"

Respond ONLY with a JSON object in this format:
{
  "action": "filter_leads" | "send_followups" | "create_campaign" | "generate_forecast" | "show_open_deals" | "create_proposal" | "generate_contract" | "show_forecast_revenue" | "show_risky_deals" | "show_deals_closing_this_month" | "update_deal_stage" | "unknown",
  "parameters": {
    "status": "string",
    "priority": "string",
    "minScore": number,
    "industry": "string",
    "target": "string",
    "name": "string",
    "goal": "string",
    "dealId": "string",
    "stage": "string"
  },
  "explanation": "Brief reasoning under 40 words explaining your translation.",
  "responseMessage": "A professional console statement outlining the action executed."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            action: { 
              type: "STRING", 
              enum: [
                "filter_leads", "send_followups", "create_campaign", "generate_forecast", 
                "show_open_deals", "create_proposal", "generate_contract", "show_forecast_revenue", 
                "show_risky_deals", "show_deals_closing_this_month", "update_deal_stage", "unknown"
              ] 
            },
            parameters: {
              type: "OBJECT",
              properties: {
                status: { type: "STRING" },
                priority: { type: "STRING" },
                minScore: { type: "INTEGER" },
                industry: { type: "STRING" },
                target: { type: "STRING" },
                name: { type: "STRING" },
                goal: { type: "STRING" },
                dealId: { type: "STRING" },
                stage: { type: "STRING" }
              }
            },
            explanation: { type: "STRING" },
            responseMessage: { type: "STRING" }
          },
          required: ["action", "explanation", "responseMessage"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    const action = parsed.action;
    const params = parsed.parameters || {};

    let responsePayload = {
      action,
      explanation: parsed.explanation,
      message: parsed.responseMessage,
      data: null
    };

    // 5. Perform the action
    if (action === "filter_leads") {
      let filtered = [...(leads || [])];
      if (params.priority) filtered = filtered.filter(l => String(l.priority).toLowerCase() === String(params.priority).toLowerCase());
      if (params.status) filtered = filtered.filter(l => String(l.status).toLowerCase().includes(String(params.status).toLowerCase()));
      if (params.minScore) filtered = filtered.filter(l => (l.score || 0) >= params.minScore);
      if (params.industry) filtered = filtered.filter(l => String(l.industry || "").toLowerCase().includes(String(params.industry).toLowerCase()));
      
      responsePayload.data = { leads: filtered };
      responsePayload.message = `Found ${filtered.length} leads matching criteria: ${JSON.stringify(params)}`;

    } else if (action === "send_followups") {
      let targets = [...(leads || [])];
      if (params.target === "at_risk") targets = targets.filter(l => l.nurture_status === "At Risk");
      else if (params.target === "hot") targets = targets.filter(l => l.priority === "Hot");
      else targets = targets.filter(l => ["At Risk", "Needs Immediate Followup"].includes(l.nurture_status));

      let queuedCount = 0;
      for (const lead of targets) {
        const task = await queueApprovalRequiredTask(lead.id, "followup", "NL command follow-up trigger", userId, organizationId);
        if (task) queuedCount++;
      }
      responsePayload.message = `Successfully drafted and queued ${queuedCount} follow-up tasks for review in Agent Center.`;
      responsePayload.data = { queuedCount };

    } else if (action === "create_campaign") {
      const campaignLeads = (leads || []).filter(l => l.email && String(l.industry || "").toLowerCase().includes(String(params.industry || "").toLowerCase()));
      responsePayload.message = `Interpreted Campaign creation for industry '${params.industry || "General"}'. Found ${campaignLeads.length} leads.`;
      responsePayload.data = {
        campaignName: params.name || `${params.industry || "General"} AI Outreach`,
        campaignGoal: params.goal || `Introduce our sales services to ${params.industry || "General"} prospects.`,
        leadIds: campaignLeads.map(l => l.id)
      };

    } else if (action === "generate_forecast") {
      const activeLeads = (leads || []).filter(l => !["Closed Lost", "Closed Won"].includes(l.status));
      let totalForecast = 0, sumProb = 0;
      activeLeads.forEach(l => {
        const value = Number(l.value) || 0, score = Number(l.score) || 0;
        totalForecast += value * (score / 100);
        sumProb += score / 100;
      });
      const avgProb = activeLeads.length > 0 ? Math.round((sumProb / activeLeads.length) * 100) : 0;
      const closedWonValue = (leads || []).filter(l => l.status === "Closed Won").reduce((acc, l) => acc + (Number(l.value) || 0), 0);
      
      responsePayload.message = `Pipeline forecast: Avg probability ${avgProb}% across ${activeLeads.length} leads.`;
      responsePayload.data = {
        forecastRevenue: Math.round(totalForecast),
        averageClosingProbability: avgProb,
        projectedRevenue: Math.round(totalForecast + closedWonValue)
      };

    } else if (action === "show_open_deals") {
      const openDeals = (deals || []).filter(d => d.stage !== "Won" && d.stage !== "Lost" && d.status !== "won" && d.status !== "lost");
      responsePayload.message = `Found ${openDeals.length} open deals currently in the pipeline.`;
      responsePayload.data = { deals: openDeals };

    } else if (action === "create_proposal") {
      if (!params.dealId) {
        throw new Error("Could not identify the correct deal to generate proposal.");
      }
      const newProposal = await generateProposal(params.dealId);
      responsePayload.message = `AI Proposal generated successfully for Deal: "${newProposal.proposal_title}" (v${newProposal.proposal_version}).`;
      responsePayload.data = { proposal: newProposal };

    } else if (action === "generate_contract") {
      if (!params.dealId) {
        throw new Error("Could not identify the correct deal to generate contract.");
      }
      const newContract = await generateContract(params.dealId);
      responsePayload.message = `AI Contract drafted successfully. Saved service agreement to database in draft status.`;
      responsePayload.data = { contract: newContract };

    } else if (action === "show_forecast_revenue") {
      const forecastData = await updateDealForecasts(userId, organizationId);
      const val = forecastData ? forecastData.projectedRevenue : 0;
      responsePayload.message = `Your expected revenue for this month is $${val.toLocaleString()} (Weighted Pipeline: $${(forecastData ? forecastData.weightedPipeline : 0).toLocaleString()}).`;
      responsePayload.data = forecastData;

    } else if (action === "show_risky_deals") {
      const riskyDeals = (deals || []).filter(d => d.risk_level === "High" || (d.close_probability || 50) < 40);
      responsePayload.message = `Found ${riskyDeals.length} high-risk deals requiring immediate attention.`;
      responsePayload.data = { deals: riskyDeals };

    } else if (action === "show_deals_closing_this_month") {
      const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
      const closingDeals = (deals || []).filter(d => d.expected_close_date && d.expected_close_date.startsWith(currentMonthStr));
      responsePayload.message = `Found ${closingDeals.length} deals scheduled to close this month.`;
      responsePayload.data = { deals: closingDeals };

    } else if (action === "update_deal_stage") {
      if (!params.dealId || !params.stage) {
        throw new Error("Deal ID and target stage are required to update deal stage.");
      }
      
      const targetStatus = (params.stage === "Won" ? "won" : params.stage === "Lost" ? "lost" : "open");
      
      const { data: updatedDeal, error: updateErr } = await supabase
        .from("deals")
        .update({ stage: params.stage, status: targetStatus })
        .eq("id", params.dealId)
        .eq("organization_id", organizationId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Synchronization logic: Deal Won -> Lead Closed Won, Deal Lost -> Lead Closed Lost
      if (updatedDeal.lead_id) {
        if (params.stage === "Won") {
          await supabase.from("leads").update({ status: "Closed Won" }).eq("id", updatedDeal.lead_id).eq("organization_id", organizationId);
        } else if (params.stage === "Lost") {
          await supabase.from("leads").update({ status: "Closed Lost" }).eq("id", updatedDeal.lead_id).eq("organization_id", organizationId);
        }
      }

      // Log activity
      await supabase
        .from("deal_activities")
        .insert([{
          deal_id: params.dealId,
          activity_type: params.stage,
          description: `Stage updated via Executive AI Agent Command to '${params.stage}'`,
          organization_id: organizationId
        }]);

      // Recalculate forecasts
      await updateDealForecasts(userId, organizationId);

      responsePayload.message = `Successfully moved deal "${updatedDeal.title}" to stage: ${params.stage}. Dual CRM sync completed.`;
      responsePayload.data = { deal: updatedDeal };

    } else {
      responsePayload.message = `I couldn't recognize a valid action for the command: "${command}". Try deal commands like "Show open deals", "Generate proposal for Rajesh Export", "Mark deal won", or "Show forecast revenue".`;
    }

    return NextResponse.json(responsePayload);

  } catch (err) {
    console.error("Error in executive agent command route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
