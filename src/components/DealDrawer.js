"use client";

import React, { useState, useEffect } from "react";
import { useElevate } from "@/components/Context";
import { 
  Sparkles, Calendar, Clock, MessageSquare, Copy, Play, 
  User, Building, DollarSign, Award, CheckCircle2, ChevronRight, X, AlertTriangle, FileText
} from "lucide-react";
import { evaluateDealHealthSync } from "@/lib/dealIntelligence";

export default function DealDrawer({ dealId, onClose }) {
  const {
    deals,
    proposals,
    contracts,
    updateDeal,
    generateProposal,
    generateContract,
    logActivity,
    user
  } = useElevate();

  const [activeTab, setActiveTab] = useState("overview");
  const [editNotes, setEditNotes] = useState("");
  const [editValue, setEditValue] = useState(0);
  const [editStage, setEditStage] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editSource, setEditSource] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dealActivities, setDealActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // Document generation flags
  const [generatingProposalFlag, setGeneratingProposalFlag] = useState(false);
  const [generatingContractFlag, setGeneratingContractFlag] = useState(false);

  const deal = deals.find((d) => d.id === dealId);

  // Sync state with deal changes
  useEffect(() => {
    if (deal) {
      setEditNotes(deal.notes || "");
      setEditValue(deal.value || 0);
      setEditStage(deal.stage || "Qualified");
      setEditTitle(deal.title || "");
      setEditSource(deal.source || "CRM Lead");
      setActiveTab("overview");
      
      // Fetch deal activities from database
      const fetchActivities = async () => {
        try {
          setLoadingActivities(true);
          const { supabase } = await import("@/lib/supabase");
          const { data, error } = await supabase
            .from("deal_activities")
            .select("*")
            .eq("deal_id", deal.id)
            .order("created_at", { ascending: false });
          if (!error && data) {
            setDealActivities(data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingActivities(false);
        }
      };
      fetchActivities();
    }
  }, [dealId, deal]);

  if (!deal) return null;

  // Run deal health evaluation
  const health = evaluateDealHealthSync(deal);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateDeal(dealId, {
        title: editTitle,
        value: Number(editValue) || 0,
        stage: editStage,
        status: (editStage === "Won" ? "won" : editStage === "Lost" ? "lost" : "open"),
        notes: editNotes,
        source: editSource
      });
      alert("Deal saved successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save changes: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateProposal = async () => {
    try {
      setGeneratingProposalFlag(true);
      await generateProposal(dealId);
      alert("Proposal generated successfully!");
      setActiveTab("documents");
    } catch (err) {
      alert("Proposal generation failed: " + err.message);
    } finally {
      setGeneratingProposalFlag(false);
    }
  };

  const handleGenerateContract = async () => {
    try {
      setGeneratingContractFlag(true);
      await generateContract(dealId);
      alert("Contract drafted successfully!");
      setActiveTab("documents");
    } catch (err) {
      alert("Contract drafting failed: " + err.message);
    } finally {
      setGeneratingContractFlag(false);
    }
  };

  const associatedProposals = proposals.filter(p => p.deal_id === dealId);
  const associatedContracts = contracts.filter(c => c.deal_id === dealId);

  const getRiskBadge = (risk) => {
    let bg = "rgba(255, 255, 255, 0.05)";
    let color = "var(--text-muted)";
    let border = "1px solid rgba(255, 255, 255, 0.1)";

    if (risk === "Low") {
      bg = "rgba(109, 201, 165, 0.12)";
      color = "var(--accent-emerald)";
      border = "1px solid rgba(109, 201, 165, 0.2)";
    } else if (risk === "Medium") {
      bg = "rgba(214, 178, 74, 0.12)";
      color = "var(--accent-gold)";
      border = "1px solid rgba(214, 178, 74, 0.2)";
    } else if (risk === "High") {
      bg = "rgba(220, 38, 38, 0.12)";
      color = "#ff8b8b";
      border = "1px solid rgba(220, 38, 38, 0.2)";
    }

    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: "999px",
        background: bg,
        color: color,
        border: border,
        fontSize: "0.75rem",
        fontWeight: "600",
        letterSpacing: "0.02em"
      }}>
        {risk} Risk
      </span>
    );
  };

  return (
    <div 
      style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0, left: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
        animation: "fadeIn 0.25s ease-out"
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: "100%",
          maxWidth: "600px",
          height: "100%",
          background: "rgba(10, 10, 12, 0.96)",
          backdropFilter: "blur(30px)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "-15px 0 45px rgba(0,0,0,0.9)",
          padding: "36px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          overflowY: "auto",
          animation: "slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
          <div>
            <h3 className="serif-display" style={{ fontSize: "1.6rem", margin: 0, color: "var(--text-primary)" }}>{deal.title}</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Deal Detail Workspace • Lead: {deal.leads?.name || "Unlinked"}
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-color)",
              color: "var(--text-muted)",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "grid",
              placeItems: "center"
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", overflowX: "auto" }}>
          {["overview", "ai-intelligence", "documents", "activities"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 12px",
                borderRadius: "4px",
                background: activeTab === tab ? "rgba(214, 178, 74, 0.15)" : "transparent",
                color: activeTab === tab ? "var(--accent-gold)" : "var(--text-muted)",
                border: activeTab === tab ? "1px solid rgba(214, 178, 74, 0.3)" : "1px solid transparent",
                fontSize: "0.75rem",
                fontWeight: "600",
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.2s"
              }}
            >
              {tab.replace("-", " ")}
            </button>
          ))}
        </div>

        {/* Tab content renders */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Deal Title</label>
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  className="form-input" 
                  style={{ height: "42px", padding: "8px 12px" }}
                />
              </div>

              <div className="grid-2" style={{ gap: "16px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Deal Value ($)</label>
                  <input 
                    type="number" 
                    value={editValue} 
                    onChange={(e) => setEditValue(Number(e.target.value) || 0)} 
                    className="form-input" 
                    style={{ height: "42px", padding: "8px 12px" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Pipeline Stage</label>
                  <select 
                    value={editStage} 
                    onChange={(e) => setEditStage(e.target.value)} 
                    className="form-input" 
                    style={{ height: "42px", padding: "8px 12px", background: "var(--bg-color)" }}
                  >
                    <option value="Lead">Lead</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Discovery">Discovery</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Deal Source</label>
                <input 
                  type="text" 
                  value={editSource} 
                  onChange={(e) => setEditSource(e.target.value)} 
                  className="form-input" 
                  style={{ height: "42px", padding: "8px 12px" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Deal Notes</label>
                <textarea 
                  value={editNotes} 
                  onChange={(e) => setEditNotes(e.target.value)} 
                  className="form-input" 
                  style={{ minHeight: "120px", padding: "10px 12px", resize: "vertical" }}
                />
              </div>
            </div>

            <button 
              className="btn btn-gold" 
              style={{ width: "100%", marginTop: "10px", height: "44px" }} 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Deal Changes"}
            </button>
          </div>
        )}

        {activeTab === "ai-intelligence" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="premium-card gold-glow" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--accent-gold)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  AI Deal Health Card
                </span>
                {getRiskBadge(health.riskLevel)}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Close Probability</span>
                  <strong style={{ fontSize: "1.8rem", color: "var(--text-primary)" }}>{health.closeProbability}%</strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Forecast Value</span>
                  <strong style={{ fontSize: "1.8rem", color: "var(--accent-gold)" }}>${health.forecastValue.toLocaleString()}</strong>
                </div>
              </div>

              <div style={{ background: "rgba(214, 178, 74, 0.04)", border: "1px solid rgba(214, 178, 74, 0.15)", padding: "16px", borderRadius: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <strong style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--accent-gold)" }}>
                  <Sparkles size={14} />
                  <span>AI Recommended Action</span>
                </strong>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.4" }}>
                  {health.nextAction}
                </p>
              </div>

              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                * Evaluation incorporates prospect lead score ({deal.leads?.score || 40}), nurture status ({deal.leads?.nurture_status || "Cold"}), and pipeline stage.
              </div>
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Proposals Section */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "20px", borderRadius: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h4 style={{ fontSize: "0.9rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FileText size={14} style={{ color: "var(--accent-gold)" }} />
                  <span>Proposals ({associatedProposals.length})</span>
                </h4>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={handleGenerateProposal}
                  disabled={generatingProposalFlag}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", padding: "6px 12px" }}
                >
                  <Sparkles size={12} />
                  <span>{generatingProposalFlag ? "Generating..." : "Generate AI Proposal"}</span>
                </button>
              </div>

              {associatedProposals.length === 0 ? (
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>No proposals drafted yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {associatedProposals.map(p => (
                    <div key={p.id} style={{ background: "var(--surface-color)", border: "1px solid var(--border-color)", padding: "10px 12px", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "0.8rem", color: "var(--text-primary)", display: "block" }}>{p.proposal_title}</strong>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>v{p.proposal_version} • Drafted {new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                      <span className="badge-score" style={{ textTransform: "capitalize", background: "rgba(255,255,255,0.05)" }}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contracts Section */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "20px", borderRadius: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h4 style={{ fontSize: "0.9rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Award size={14} style={{ color: "var(--accent-emerald)" }} />
                  <span>Contracts ({associatedContracts.length})</span>
                </h4>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={handleGenerateContract}
                  disabled={generatingContractFlag}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", padding: "6px 12px" }}
                >
                  <Sparkles size={12} />
                  <span>{generatingContractFlag ? "Drafting..." : "Generate AI Contract"}</span>
                </button>
              </div>

              {associatedContracts.length === 0 ? (
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>No service contracts drafted yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {associatedContracts.map(c => (
                    <div key={c.id} style={{ background: "var(--surface-color)", border: "1px solid var(--border-color)", padding: "10px 12px", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "0.8rem", color: "var(--text-primary)", display: "block" }}>Service Agreement</strong>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Drafted {new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <span className="badge-score" style={{ 
                        background: c.signed ? "rgba(109,201,165,0.12)" : "rgba(214,178,74,0.12)",
                        color: c.signed ? "var(--accent-emerald)" : "var(--accent-gold)"
                      }}>
                        {c.signed ? "Signed" : "Unsigned"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "activities" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h4 style={{ fontSize: "0.9rem", fontWeight: "600" }}>Milestones & Action History</h4>

            {loadingActivities ? (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>Loading milestones...</p>
            ) : dealActivities.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)", fontSize: "0.78rem", border: "1px dashed var(--border-color)", borderRadius: "6px" }}>
                <Clock size={24} style={{ opacity: 0.3, marginBottom: "8px" }} />
                <p>No activity milestones logged for this deal yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", position: "relative", paddingLeft: "16px" }}>
                <div style={{ position: "absolute", left: "6px", top: "10px", bottom: "10px", width: "1px", background: "rgba(255,255,255,0.08)" }} />

                {dealActivities.map((act) => {
                  let dotColor = "var(--accent-gold)";
                  if (act.activity_type === "Won") dotColor = "var(--accent-emerald)";
                  else if (act.activity_type === "Lost") dotColor = "#dc2626";

                  return (
                    <div key={act.id} style={{ position: "relative", marginBottom: "8px" }}>
                      <div style={{
                        position: "absolute", left: "-14px", top: "4px", width: "7px", height: "7px", borderRadius: "50%",
                        background: dotColor,
                        boxShadow: `0 0 8px ${dotColor}`
                      }} />

                      <div style={{ fontSize: "0.8rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ color: "var(--text-primary)" }}>{act.activity_type}</strong>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            {new Date(act.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.78rem", lineHeight: "1.4" }}>
                          {act.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: "flex", gap: "12px", marginTop: "auto", paddingTop: "20px", borderTop: "1px solid var(--border-color)" }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ width: "100%" }}
          >
            Close Deal Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
