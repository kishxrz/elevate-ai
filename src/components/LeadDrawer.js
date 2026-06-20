"use client";

import React, { useState, useEffect } from "react";
import { useElevate } from "@/components/Context";
import { 
  Sparkles, Calendar, Clock, MessageSquare, Copy, Play, 
  User, Building, Phone, Mail, Award, CheckCircle2, ChevronRight, X
} from "lucide-react";

export default function LeadDrawer({ leadId, onClose }) {
  console.log("LEADDRAWER COMPONENT MOUNTED");
  const {
    leads,
    activities,
    appointments,
    followups,
    generateFollowup,
    bookGoogleMeeting,
    cancelGoogleMeeting,
    googleConnected,
    loadingAppointments,
    updateLead
  } = useElevate();

  const [activeTab, setActiveTab] = useState("overview");
  
  // Overview Tab Fields
  const [editNotes, setEditNotes] = useState("");
  const [editValue, setEditValue] = useState(0);
  const [editStage, setEditStage] = useState("");
  const [isSavingDrawer, setIsSavingDrawer] = useState(false);

  // Booking Form State
  const [bookingTitle, setBookingTitle] = useState("");
  const [bookingStartTime, setBookingStartTime] = useState("");
  const [bookingEndTime, setBookingEndTime] = useState("");
  const [bookingDescription, setBookingDescription] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // Follow-up generation state
  const [generatingFollowupId, setGeneratingFollowupId] = useState(null);

  const lead = leads.find((l) => l.id === leadId);

  // Parse helper for notes
  const parseLeadNotes = (notesText) => {
    if (!notesText) return { reasoning: "", nextAction: "", original: "" };
    
    const reasonMatch = notesText.match(/\[AI Reason\]:\s*([\s\S]*?)(?=\n\[Next Action\]:|\n----------------------------------------|$)/);
    const actionMatch = notesText.match(/\[Next Action\]:\s*([\s\S]*?)(?=\n----------------------------------------|\n\[AI Reason\]:|$)/);
    const originalMatch = notesText.match(/----------------------------------------\s*\n?\[Original Notes\]:\s*([\s\S]*)$/);
    
    return {
      reasoning: reasonMatch ? reasonMatch[1].trim() : "",
      nextAction: actionMatch ? actionMatch[1].trim() : "",
      original: originalMatch ? originalMatch[1].trim() : notesText
    };
  };

  // Synchronize lead data fields on load or change
  useEffect(() => {
    if (lead) {
      setEditNotes(lead.notes || "");
      setEditValue(lead.value || 0);
      setEditStage(lead.status || "");
      setActiveTab("overview");
    }
  }, [leadId, lead]);

  // Synchronize Booking Default Fields on load
  useEffect(() => {
    if (lead) {
      setBookingTitle(`Elevate AI Strategy Session with ${lead.name}`);
      // Default start time: tomorrow at 10:00 AM local time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const pad = (num) => String(num).padStart(2, '0');
      const formattedStart = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
      setBookingStartTime(formattedStart);

      // Default end time: tomorrow at 11:00 AM local time
      tomorrow.setHours(11, 0, 0, 0);
      const formattedEnd = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
      setBookingEndTime(formattedEnd);

      setBookingDescription(`Discuss custom pipeline automation solutions for ${lead.company || lead.name}.`);
    }
  }, [leadId, lead]);

  if (!lead) return null;

  // AI Details Computation
  const showAIScore = lead.ai_score !== undefined && lead.ai_score !== null ? lead.ai_score : lead.score;
  const showAISummary = lead.ai_summary || parseLeadNotes(lead.notes).reasoning;
  const showAIAction = lead.recommended_action || parseLeadNotes(lead.notes).nextAction;
  const showAIStatus = lead.priority || (showAIScore >= 80 ? "Hot" : showAIScore >= 50 ? "Warm" : "Cold");

  const getAIQualificationBadge = (score, notes) => {
    const hasBeenAIQualified = notes && notes.includes("[AI Reason]:");
    if (!hasBeenAIQualified) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: "22px",
          padding: "0 8px",
          borderRadius: "999px",
          background: "rgba(255, 255, 255, 0.04)",
          color: "var(--text-muted)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          fontSize: "0.7rem",
          fontWeight: "500",
          letterSpacing: "0.02em"
        }}>
          ⏳ Qualifying...
        </span>
      );
    }
    if (score >= 80) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: "22px",
          padding: "0 8px",
          borderRadius: "999px",
          background: "rgba(109, 201, 165, 0.12)",
          color: "var(--accent-emerald)",
          border: "1px solid rgba(109, 201, 165, 0.2)",
          fontSize: "0.7rem",
          fontWeight: "600",
          letterSpacing: "0.02em"
        }}>
          🔥 Hot
        </span>
      );
    } else if (score >= 50) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: "22px",
          padding: "0 8px",
          borderRadius: "999px",
          background: "rgba(214, 178, 74, 0.12)",
          color: "var(--accent-gold)",
          border: "1px solid rgba(214, 178, 74, 0.2)",
          fontSize: "0.7rem",
          fontWeight: "600",
          letterSpacing: "0.02em"
        }}>
          ⚡ Warm
        </span>
      );
    } else {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: "22px",
          padding: "0 8px",
          borderRadius: "999px",
          background: "rgba(255, 255, 255, 0.06)",
          color: "var(--text-muted)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          fontSize: "0.7rem",
          fontWeight: "600",
          letterSpacing: "0.02em"
        }}>
          ❄️ Cold
        </span>
      );
    }
  };

  const handleSaveDrawer = async () => {
    try {
      setIsSavingDrawer(true);
      await updateLead(leadId, {
        notes: editNotes,
        value: Number(editValue) || 0,
        status: editStage
      });
      alert("Changes saved to Supabase successfully!");
      onClose();
    } catch (err) {
      console.error("Failed to save changes from drawer:", err);
    } finally {
      setIsSavingDrawer(false);
    }
  };

  const handleBookMeeting = async (e) => {
    e.preventDefault();
    if (!bookingTitle || !bookingStartTime || !bookingEndTime) {
      alert("Please fill in all required fields (Title, Start Time, and End Time).");
      return;
    }

    if (new Date(bookingStartTime) >= new Date(bookingEndTime)) {
      alert("Start time must be before the end time.");
      return;
    }

    try {
      setBookingLoading(true);
      await bookGoogleMeeting({
        leadId: leadId,
        title: bookingTitle,
        startTime: new Date(bookingStartTime).toISOString(),
        endTime: new Date(bookingEndTime).toISOString(),
        description: bookingDescription,
      });
      alert("Success! Your consultation has been scheduled.");
    } catch (err) {
      console.error(err);
    } finally {
      setBookingLoading(false);
    }
  };

  const copyToClipboard = (text, message) => {
    navigator.clipboard.writeText(text);
    alert(message || "Copied to clipboard!");
  };

  return (
    <div 
      style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0, left: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
        animation: "fadeIn 0.2s ease-out"
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: "100%",
          maxWidth: "600px",
          height: "100%",
          background: "rgba(10, 10, 12, 0.95)",
          backdropFilter: "blur(30px)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "-15px 0 45px rgba(0,0,0,0.9)",
          padding: "36px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          overflowY: "auto",
          animation: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
          <div>
            <h3 className="serif-display" style={{ fontSize: "1.6rem", margin: 0 }}>{lead.name}</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {lead.company || "No Company"} • {lead.industry} industry
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
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

        {/* Drawer Tabs Navigation */}
        <div 
          className="tabs-container"
          style={{ 
            display: "flex", 
            flexWrap: "wrap",
            gap: "8px", 
            borderBottom: "1px solid var(--border-color)", 
            paddingBottom: "12px", 
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none"
          }}
        >
          {["overview", "ai-analysis", "follow-ups", "activities", "appointments"].map(tab => (
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
                whiteSpace: "nowrap",
                transition: "all 0.2s"
              }}
            >
              {tab.replace("-", " ")}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.88rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Email:</span>
                <strong>{lead.email}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Phone:</span>
                <strong>{lead.phone || "Not provided"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Source:</span>
                <strong>{lead.source}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Created Date:</span>
                <strong>{lead.date}</strong>
              </div>
              {lead.last_activity_at && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "8px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Last Activity:</span>
                  <strong>{new Date(lead.last_activity_at).toLocaleString()}</strong>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <h4 style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "600" }}>Edit Deal Parameters</h4>
              
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
                  <label className="form-label">CRM Stage</label>
                  <select 
                    value={editStage} 
                    onChange={(e) => setEditStage(e.target.value)} 
                    className="form-input" 
                    style={{ height: "42px", padding: "8px 12px", background: "var(--bg-color)" }}
                  >
                    <option value="New Lead">New Lead</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Appointment Booked">Appointment Booked</option>
                    <option value="Closed Won">Closed Won</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Prospect Notes</label>
                <textarea 
                  value={editNotes} 
                  onChange={(e) => setEditNotes(e.target.value)} 
                  className="form-input" 
                  style={{ minHeight: "100px", padding: "10px 12px", resize: "vertical" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
              <button 
                className="btn btn-gold" 
                style={{ flexGrow: "1" }} 
                onClick={handleSaveDrawer}
                disabled={isSavingDrawer}
              >
                {isSavingDrawer ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: AI Analysis */}
        {activeTab === "ai-analysis" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="premium-card gold-glow" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--accent-gold)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  AI Lead Scoring Card
                </span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className="badge-score" style={{ fontWeight: "700" }}>{showAIScore}</span>
                  {getAIQualificationBadge(showAIScore, lead.notes)}
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Lead Priority Score
                </span>
                <strong style={{ fontSize: "1.2rem", color: "var(--text-primary)" }}>{showAIScore} / 100</strong>
              </div>

              {showAISummary ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ background: "rgba(109, 201, 165, 0.04)", border: "1px solid rgba(109, 201, 165, 0.15)", padding: "12px", borderRadius: "var(--radius-sm)" }}>
                    <strong style={{ display: "block", fontSize: "0.8rem", color: "var(--accent-emerald)", marginBottom: "4px" }}>
                      💡 AI Lead Qualification Assessment
                    </strong>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.45" }}>
                      {showAISummary}
                    </p>
                  </div>

                  <div style={{ background: "rgba(214, 178, 74, 0.04)", border: "1px solid rgba(214, 178, 74, 0.15)", padding: "12px", borderRadius: "var(--radius-sm)" }}>
                    <strong style={{ display: "block", fontSize: "0.8rem", color: "var(--accent-gold)", marginBottom: "4px" }}>
                      ⚡ Recommended Action Plan
                    </strong>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.45" }}>
                      {showAIAction}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "10px", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  ⏳ Lead qualification in progress or pending AI execution...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Follow-Ups */}
        {activeTab === "follow-ups" && (() => {
          const leadFollowups = followups.filter(f => f.lead_id === lead.id);
          const latestFollowup = leadFollowups[0];

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: "0.9rem", fontWeight: "600" }}>AI Follow-Up Assets</h4>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={async () => {
                    try {
                      setGeneratingFollowupId(lead.id);
                      await generateFollowup(lead.id);
                      alert("AI Follow-up generated successfully!");
                    } catch (err) {
                      alert("Failed to generate follow-up: " + err.message);
                    } finally {
                      setGeneratingFollowupId(null);
                    }
                  }}
                  disabled={generatingFollowupId === lead.id}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", padding: "6px 12px" }}
                >
                  <Sparkles size={12} />
                  <span>{generatingFollowupId === lead.id ? "Generating..." : "Generate Follow-Up"}</span>
                </button>
              </div>

              {latestFollowup ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "10px" }}>
                  {/* WhatsApp Card */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--accent-emerald)" }}>WhatsApp message</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => copyToClipboard(latestFollowup.whatsapp_message, "WhatsApp draft copied!")}
                        style={{ padding: "4px 8px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                    <p style={{ fontSize: "0.78rem", whiteSpace: "pre-wrap", color: "var(--text-secondary)", lineHeight: "1.45" }}>
                      {latestFollowup.whatsapp_message}
                    </p>
                  </div>

                  {/* Email Card */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--accent-gold)" }}>Email Campaign Draft</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const text = `Subject: ${latestFollowup.email_subject}\n\n${latestFollowup.email_body}`;
                          copyToClipboard(text, "Email Subject & Body copied!");
                        }}
                        style={{ padding: "4px 8px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <Copy size={10} /> Copy All
                      </button>
                    </div>
                    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px", marginBottom: "8px" }}>
                      <strong style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Subject:</strong>
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-primary)" }}>{latestFollowup.email_subject}</span>
                    </div>
                    <div 
                      style={{ fontSize: "0.78rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: "1.45", maxHeight: "150px", overflowY: "auto" }} 
                      dangerouslySetInnerHTML={{ __html: latestFollowup.email_body }} 
                    />
                  </div>

                  {/* Call Script Card */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-primary)" }}>Call script</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => copyToClipboard(latestFollowup.call_script, "Call script copied!")}
                        style={{ padding: "4px 8px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                    <p style={{ fontSize: "0.78rem", whiteSpace: "pre-wrap", color: "var(--text-secondary)", lineHeight: "1.45" }}>
                      {latestFollowup.call_script}
                    </p>
                  </div>

                  {/* Recommended Action */}
                  <div style={{ background: "rgba(214,178,74,0.05)", border: "1px solid rgba(214,178,74,0.2)", padding: "12px", borderRadius: "6px" }}>
                    <strong style={{ display: "block", fontSize: "0.75rem", color: "var(--accent-gold)", marginBottom: "4px" }}>Next Action / Status:</strong>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0 }}>{latestFollowup.next_action}</p>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)", fontSize: "0.78rem", border: "1px dashed var(--border-color)", borderRadius: "6px" }}>
                  <MessageSquare size={24} style={{ opacity: 0.3, marginBottom: "8px" }} />
                  <p>No follow-up materials generated yet for this lead.</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Tab 4: Activities */}
        {activeTab === "activities" && (() => {
          const leadActivities = activities.filter(a => a.lead_id === lead.id);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: "600" }}>Lead Activity Logs</h4>

              {leadActivities.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)", fontSize: "0.78rem", border: "1px dashed var(--border-color)", borderRadius: "6px" }}>
                  <Clock size={24} style={{ opacity: 0.3, marginBottom: "8px" }} />
                  <p>No activities recorded for this lead.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", position: "relative", paddingLeft: "16px" }}>
                  {/* Timeline line */}
                  <div style={{ position: "absolute", left: "6px", top: "10px", bottom: "10px", width: "1px", background: "rgba(255,255,255,0.08)" }} />

                  {leadActivities.map((act) => {
                    const isBrief = act.type === "meeting_brief";
                    return (
                      <div key={act.id} style={{ position: "relative", marginBottom: "8px" }}>
                        {/* Timeline node */}
                        <div style={{
                          position: "absolute", left: "-14px", top: "4px", width: "7px", height: "7px", borderRadius: "50%",
                          background: isBrief ? "var(--accent-gold)" : "var(--accent-emerald)",
                          boxShadow: isBrief ? "0 0 8px var(--accent-gold)" : "none"
                        }} />

                        <div style={{ fontSize: "0.8rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong style={{ color: "var(--text-primary)" }}>{act.message || `[${act.type.toUpperCase()}]`}</strong>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              {act.created_at ? new Date(act.created_at).toLocaleDateString() : "Just now"}
                            </span>
                          </div>

                          {isBrief && act.content && (
                            <div style={{
                              marginTop: "8px", background: "rgba(214,178,74,0.03)", border: "1px solid rgba(214,178,74,0.15)",
                              padding: "12px", borderRadius: "6px", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "8px"
                            }}>
                              <div>
                                <strong style={{ color: "var(--accent-gold)" }}>Meeting Brief:</strong>
                                <p style={{ margin: "2px 0 0 0", color: "var(--text-secondary)" }}>{act.content.meeting_brief}</p>
                              </div>
                              {act.content.recommended_pitch && (
                                <div>
                                  <strong style={{ color: "var(--accent-gold)" }}>Recommended Pitch:</strong>
                                  <p style={{ margin: "2px 0 0 0", color: "var(--text-secondary)" }}>{act.content.recommended_pitch}</p>
                                </div>
                              )}
                              {act.content.pain_points && (
                                <div>
                                  <strong style={{ color: "var(--accent-gold)" }}>Pain Points:</strong>
                                  <p style={{ margin: "2px 0 0 0", color: "var(--text-secondary)" }}>{act.content.pain_points}</p>
                                </div>
                              )}
                              {act.content.expected_questions && (
                                <div>
                                  <strong style={{ color: "var(--accent-gold)" }}>Expected Objections:</strong>
                                  <p style={{ margin: "2px 0 0 0", color: "var(--text-secondary)" }}>{act.content.expected_questions}</p>
                                </div>
                              )}
                              {act.content.recommended_offer && (
                                <div>
                                  <strong style={{ color: "var(--accent-gold)" }}>Recommended Offer:</strong>
                                  <p style={{ margin: "2px 0 0 0", color: "var(--text-secondary)" }}>{act.content.recommended_offer}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Tab 5: Appointments */}
        {activeTab === "appointments" && (() => {
          const leadAppointments = appointments.filter(a => a.lead_id === lead.id);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "6px" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--accent-gold)", marginBottom: "12px" }}>Schedule a New Consultation</h4>
                
                <form onSubmit={handleBookMeeting} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.7rem" }}>Meeting Title</label>
                    <input
                      type="text"
                      value={bookingTitle}
                      onChange={(e) => setBookingTitle(e.target.value)}
                      className="form-input"
                      style={{ height: "36px", fontSize: "0.75rem" }}
                      required
                    />
                  </div>
                  
                  <div className="grid-2" style={{ gap: "12px" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.7rem" }}>Start Time</label>
                      <input
                        type="datetime-local"
                        value={bookingStartTime}
                        onChange={(e) => setBookingStartTime(e.target.value)}
                        className="form-input"
                        style={{ height: "36px", fontSize: "0.75rem" }}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.7rem" }}>End Time</label>
                      <input
                        type="datetime-local"
                        value={bookingEndTime}
                        onChange={(e) => setBookingEndTime(e.target.value)}
                        className="form-input"
                        style={{ height: "36px", fontSize: "0.75rem" }}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.7rem" }}>Agenda / Context</label>
                    <textarea
                      value={bookingDescription}
                      onChange={(e) => setBookingDescription(e.target.value)}
                      className="form-input"
                      style={{ minHeight: "50px", fontSize: "0.75rem" }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-gold btn-sm"
                    disabled={bookingLoading}
                    style={{ width: "100%", height: "36px" }}
                  >
                    {bookingLoading ? "Scheduling..." : "Schedule via Google Calendar"}
                  </button>
                </form>
              </div>

              <div style={{ marginTop: "10px" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: "600", marginBottom: "10px" }}>Scheduled Consultations ({leadAppointments.length})</h4>
                {leadAppointments.length === 0 ? (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>No meetings booked yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {leadAppointments.map(apt => (
                      <div key={apt.id} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", padding: "10px 12px", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                        <div>
                          <strong style={{ fontSize: "0.8rem", display: "block" }}>{apt.title}</strong>
                          <span style={{ fontSize: "0.7rem", color: "var(--accent-gold)" }}>{new Date(apt.start_time).toLocaleString()}</span>
                          {apt.meet_link && (
                            <a
                              href={apt.meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "var(--accent-emerald)", marginTop: "4px", textDecoration: "underline" }}
                            >
                              <Play size={8} /> Join Meet
                            </a>
                          )}
                        </div>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => cancelGoogleMeeting(apt.id)}
                          style={{ padding: "2px 6px", fontSize: "0.65rem" }}
                          disabled={apt.status === "cancelled"}
                        >
                          {apt.status === "cancelled" ? "Cancelled" : "Cancel"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <div style={{ display: "flex", gap: "12px", marginTop: "auto", paddingTop: "20px", borderTop: "1px solid var(--border-color)" }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isSavingDrawer}
            style={{ width: "100%" }}
          >
            Close Drawer
          </button>
        </div>
        <style>{`
          .tabs-container::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </div>
  );
}
