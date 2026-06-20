"use client";

import React, { useState } from "react";
import { useElevate } from "@/components/Context";
import { Sparkles, Play, Database, CheckSquare, Zap, Smartphone, MessageSquare, ArrowRight } from "lucide-react";

export default function DemoView() {
  const { 
    demoIndustry, 
    setDemoIndustry, 
    leads, 
    addLead 
  } = useElevate();

  // Active sandbox simulation step: "form", "chat", "pipeline"
  const [sandboxStep, setSandboxStep] = useState("form");

  // Local state for sandbox capture forms
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  
  // Gym field
  const [gymOption, setGymOption] = useState("Annual Premium Pass");
  // Clinic field
  const [clinicSeverity, setClinicSeverity] = useState("Chronic Joint Pain");
  // Leather fields
  const [leatherGrade, setLeatherGrade] = useState("Full-Grain Cowhide");
  const [leatherSkins, setLeatherSkins] = useState(250);
  // Real Estate fields
  const [realBudget, setRealBudget] = useState(2.2); // Cr
  const [realProperty, setRealProperty] = useState("4BHK Penthouse");

  // Simulated AI qualification chat logs
  const [simulatedChat, setSimulatedChat] = useState([]);

  // Trigger Sandbox Lead Submission & Run AI sequences
  const handleSandboxRun = async (e) => {
    e.preventDefault();
    if (!formName || !formEmail) return;

    let notesText = "";
    let chatTimeline = [];
    let customValue = 1000;

    if (demoIndustry === "gym") {
      customValue = 1500;
      notesText = `Interactive Trial Sandbox: Requested ${gymOption}. AI scoring evaluated as high intent fit.`;
      chatTimeline = [
        { bot: true, text: `Hello ${formName}! Thank you for your interest in Elevate Gym. I am your AI Wellness Expert. Ready to grab your Free 3-Day VIP Member Pass?` },
        { bot: false, text: `Yes, please! I want to check out the weight training equipment.` },
        { bot: true, text: `Outstanding choice. I see you prefer the '${gymOption}' membership template. May I schedule a 15-minute body composition assessment for this Monday?` },
        { bot: false, text: `Monday morning works best.` },
        { bot: true, text: `Perfect! Slot locked. I've sent your VIP Pass bar-code and scheduled the coach. Welcome to Elevate Fitness!` }
      ];
    } else if (demoIndustry === "clinic") {
      customValue = 800;
      notesText = `Patient Assessment Sandbox: Severity '${clinicSeverity}'. AI medical scoring prioritized.`;
      chatTimeline = [
        { bot: true, text: `Hello ${formName}, welcome to Clinical Care Specialties. I am your AI Patient Coordinator. What symptoms are you experiencing today?` },
        { bot: false, text: `I have severe ${clinicSeverity} that has been hurting for three months.` },
        { bot: true, text: `Thank you for sharing. Understood, this represents a chronic discomfort scale. We have direct slots open with our chief orthopedist this Wednesday at 4 PM. Shall we reserve this?` },
        { bot: false, text: `Yes, lock it in please.` },
        { bot: true, text: `Consultation confirmed! Pre-assessment insurance logs have been texted. See you soon.` }
      ];
    } else if (demoIndustry === "leather") {
      customValue = leatherSkins * 75; // $75 per skin
      notesText = `RFQ Wholesale Sandbox: Ordered ${leatherSkins} skins of ${leatherGrade}. AI quote generated.`;
      chatTimeline = [
        { bot: true, text: `Milano Premium Leather Exporters. AI B2B Quote Agent active. I see your RFQ for ${leatherGrade}. What is your target volume?` },
        { bot: false, text: `We need exactly ${leatherSkins} full skins delivered to our Milano factory.` },
        { bot: true, text: `Excellent. Based on wholesale rates for ${leatherGrade}, your estimated rough quotation is $${customValue.toLocaleString()} USD ($75/skin) including freight. Shall we draft invoice swatches?` },
        { bot: false, text: `Yes, send the draft invoice and physical swatches tracking logs.` },
        { bot: true, text: `Understood. Swatches dispatched from warehouse, tracking details sent to ${formEmail}. Invoice sent!` }
      ];
    } else if (demoIndustry === "real-estate") {
      customValue = realBudget * 100000; // normalized
      notesText = `Luxury Housing Sandbox: Interest in ${realProperty} (Budget ${realBudget} Cr). Buyer score calculated.`;
      chatTimeline = [
        { bot: true, text: `Welcome to Skyline Heights Premium Penthouses. AI Real Estate Matcher active. Are you looking to relocate or buy for rental yield?` },
        { bot: false, text: `I am looking for a ${realProperty} with a budget of around ${realBudget} Cr. Relocating from abroad.` },
        { bot: true, text: `Luxury high-rise choice. Skyline Penthouse matching: 4BHK duplex with private deck fits your requirements. Site visit scheduled for Sunday at 11 AM. Chauffeur pickup required?` },
        { bot: false, text: `Yes, please arrange the pickup.` },
        { bot: true, text: `Chauffeur details locked. Chauffeur contact emailed to your inbox. Site visit verified!` }
      ];
    }

    try {
      // Add Lead to Global Context State
      await addLead({
        name: formName,
        email: formEmail,
        phone: formPhone || "+91 63743 85901",
        industry: demoIndustry,
        value: customValue,
        notes: notesText
      });
      alert("Lead saved to Supabase successfully!");

      // Populate simulated chat
      setSimulatedChat(chatTimeline);
      setSandboxStep("chat");
    } catch (err) {
      alert(`Error saving lead: ${err.message || err}`);
    }
  };

  const handleResetSandbox = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setSandboxStep("form");
  };

  // Filter leads to show in the Sandbox Kanban CRM stage Reconcile
  const activeIndustryLeads = leads.filter(l => l.industry === demoIndustry);

  return (
    <div style={{ paddingTop: "120px" }}>
      <section className="section-wrapper">
        <div className="section-header">
          <span className="section-label">Flagship Sandbox Environment</span>
          <h2 className="section-title serif-display">
            Experience the OS in <span className="editorial-italic">real-time</span>
          </h2>
          <p className="section-subtitle">
            Switch between industry business profiles to simulate lead capturing, AI qualifications, and Kanban pipeline stage updates instantly.
          </p>
        </div>

        {/* Industry Selection Segment Toggles */}
        <div className="demo-tabs" style={{ marginBottom: "40px" }}>
          <button 
            className={`demo-tab-btn ${demoIndustry === "gym" ? "active" : ""}`}
            onClick={() => { setDemoIndustry("gym"); handleResetSandbox(); }}
          >
            <strong>Fitness & Gyms</strong>
            <span>Assessment Booking Drips</span>
          </button>
          <button 
            className={`demo-tab-btn ${demoIndustry === "clinic" ? "active" : ""}`}
            onClick={() => { setDemoIndustry("clinic"); handleResetSandbox(); }}
          >
            <strong>Clinics & Doctors</strong>
            <span>Patient Urgency Reminders</span>
          </button>
          <button 
            className={`demo-tab-btn ${demoIndustry === "leather" ? "active" : ""}`}
            onClick={() => { setDemoIndustry("leather"); handleResetSandbox(); }}
          >
            <strong>Leather Exporters</strong>
            <span>Wholesale RFQ Calculators</span>
          </button>
          <button 
            className={`demo-tab-btn ${demoIndustry === "real-estate" ? "active" : ""}`}
            onClick={() => { setDemoIndustry("real-estate"); handleResetSandbox(); }}
          >
            <strong>Real Estate Hub</strong>
            <span>Luxury Property Matchers</span>
          </button>
        </div>

        {/* Sandbox Core Visual Panels */}
        <div className="demo-showcase-container">
          
          {/* STEP 1: LEAD CAPTURE FORM */}
          {sandboxStep === "form" && (
            <div className="demo-body">
              <div>
                <span className="section-label" style={{ fontSize: "0.75rem", color: "var(--accent-gold)" }}>
                  Step 1 // Simulate Prospect Form Capture
                </span>
                <h3 className="serif-display" style={{ fontSize: "1.8rem", marginBottom: "16px", textTransform: "capitalize" }}>
                  Active environment: <span className="editorial-italic">{demoIndustry} Pipeline</span>
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.6", marginBottom: "24px" }}>
                  Submit this form to test how our AI engine qualifications auto-score leads and dispatch follow-ups instantly.
                </p>

                <form onSubmit={handleSandboxRun}>
                  <div className="form-group">
                    <label className="form-label">Prospect Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Amelia Thorne" 
                      value={formName} 
                      onChange={(e) => setFormName(e.target.value)}
                      className="form-input" 
                      required 
                    />
                  </div>

                  <div className="grid-2" style={{ gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <label className="form-label">Email Address</label>
                      <input 
                        type="email" 
                        placeholder="amelia@outlook.com" 
                        value={formEmail} 
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="form-input" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="form-label">Mobile Number</label>
                      <input 
                        type="text" 
                        placeholder="+91 63743 85901" 
                        value={formPhone} 
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="form-input" 
                      />
                    </div>
                  </div>

                  {/* Industry specific custom fields */}
                  {demoIndustry === "gym" && (
                    <div className="form-group">
                      <label className="form-label">Preferred Gym Package</label>
                      <select 
                        value={gymOption} 
                        onChange={(e) => setGymOption(e.target.value)}
                        className="form-input"
                        style={{ background: "var(--bg-color)" }}
                      >
                        <option value="Annual Premium Pass">Annual Premium Pass ($1,500/yr)</option>
                        <option value="Standard Weight Club">Standard Weight Club ($60/mo)</option>
                        <option value="Personal Coaching Bundle">Personal Coaching Bundle ($500/mo)</option>
                      </select>
                    </div>
                  )}

                  {demoIndustry === "clinic" && (
                    <div className="form-group">
                      <label className="form-label">Major Health Severity</label>
                      <select 
                        value={clinicSeverity} 
                        onChange={(e) => setClinicSeverity(e.target.value)}
                        className="form-input"
                        style={{ background: "var(--bg-color)" }}
                      >
                        <option value="Chronic Joint Pain">Chronic Spine/Joint Discomfort</option>
                        <option value="Post-surgery Rehabilitation">Post-surgery rehabilitation check</option>
                        <option value="Mild Muscle Fatigue">Mild muscle fatigue check</option>
                      </select>
                    </div>
                  )}

                  {demoIndustry === "leather" && (
                    <div className="grid-2" style={{ gap: "16px", marginBottom: "20px" }}>
                      <div>
                        <label className="form-label">Leather Grades</label>
                        <select 
                          value={leatherGrade} 
                          onChange={(e) => setLeatherGrade(e.target.value)}
                          className="form-input"
                          style={{ background: "var(--bg-color)" }}
                        >
                          <option value="Full-Grain Cowhide">Full-Grain Premium Cowhide</option>
                          <option value="Tanned Lambskin">Tanned Soft Lambskin</option>
                          <option value="Suede Leather Swatches">Exotic Suede Swatches</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">RFQ Skins Count</label>
                        <input 
                          type="number" 
                          value={leatherSkins} 
                          onChange={(e) => setLeatherSkins(parseInt(e.target.value) || 0)}
                          className="form-input" 
                        />
                      </div>
                    </div>
                  )}

                  {demoIndustry === "real-estate" && (
                    <div className="grid-2" style={{ gap: "16px", marginBottom: "20px" }}>
                      <div>
                        <label className="form-label">Luxury Asset Type</label>
                        <select 
                          value={realProperty} 
                          onChange={(e) => setRealProperty(e.target.value)}
                          className="form-input"
                          style={{ background: "var(--bg-color)" }}
                        >
                          <option value="4BHK Penthouse">Skyline Heights 4BHK Penthouse</option>
                          <option value="North Goa Sea Villa">North Goa Private Pool Villa</option>
                          <option value="Commercial Office Plot">Commercial Office Complex Area</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Budget Limit (Cr)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          value={realBudget} 
                          onChange={(e) => setRealBudget(parseFloat(e.target.value) || 0)}
                          className="form-input" 
                        />
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn btn-gold" style={{ width: "100%", marginTop: "10px" }}>
                    <Play size={14} />
                    <span>Run AI Qualification Sequence</span>
                  </button>
                </form>
              </div>

              {/* Sidebar display context */}
              <div style={{ background: "#070707", border: "1px solid var(--border-color)", padding: "32px", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", justifyCenter: "center" }}>
                <h4 style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--accent-gold)", marginBottom: "12px" }}>
                  💡 Sandbox Playbook
                </h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "16px" }}>
                  This flagship playground showcases Version 1 capabilities. Submitting the prospect initiates:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  <p>1. <strong>Capture Validation:</strong> Form input triggers local database synchronization.</p>
                  <p>2. <strong>AI Prompt Qualification:</strong> Our AI scores lead intent based on parameters.</p>
                  <p>3. <strong>Instant Message Simulation:</strong> Simulates active WhatsApp script follow-ups.</p>
                  <p>4. <strong>Kanban stage alignment:</strong> Watch the lead appear in the dashboard database!</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SIMULATED WHATSAPP DIALOG SCREEN */}
          {sandboxStep === "chat" && (
            <div className="demo-body">
              <div>
                <span className="section-label" style={{ fontSize: "0.75rem", color: "var(--accent-emerald)" }}>
                  Step 2 // WhatsApp Script Automation
                </span>
                <h3 className="serif-display" style={{ fontSize: "1.8rem", marginBottom: "16px" }}>
                  Qualifying <span className="editorial-italic">{formName} automatically</span>
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.6", marginBottom: "32px" }}>
                  Within 45 seconds of submitting the form, Elevate AI initiates an automated WhatsApp scripting logic to confirm consultation bookings.
                </p>

                <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-color)", padding: "20px", borderRadius: "var(--radius-sm)", marginBottom: "32px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                    <span>DATABASE TRIGGER</span>
                    <span style={{ color: "var(--accent-emerald)" }}>VERIFIED COMPLETE</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    ✓ New lead added to CRM: <strong>{formName}</strong>
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    ✓ Auto-qualification Score: <strong style={{ color: "var(--accent-gold)" }}>92/100 (HIGH INTENT)</strong>
                  </p>
                </div>

                <div style={{ display: "flex", gap: "16px" }}>
                  <button className="btn btn-emerald" onClick={() => setSandboxStep("pipeline")}>
                    <span>View Kanban CRM Pipeline</span>
                    <ArrowRight size={14} />
                  </button>
                  <button className="btn btn-secondary" onClick={handleResetSandbox}>
                    <span>Reset Sandbox</span>
                  </button>
                </div>
              </div>

              {/* Graphical Phone Screen mockup */}
              <div className="demo-phone-ui">
                <div className="phone-screen">
                  <div style={{ borderBottom: "1px solid #222", paddingBottom: "10px", marginBottom: "10px", display: "flex", justifySpace: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    <strong>✦ Elevate AI Engine</strong>
                    <span>WhatsApp</span>
                  </div>
                  <div style={{ flexGrow: "1", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {simulatedChat.map((msg, i) => (
                      <div key={i} className={`chat-bubble ${msg.bot ? "bot" : "user"}`}>
                        {msg.text}
                      </div>
                    ))}
                    <div className="chat-bubble ai-qualify">
                      ⚡ AI Engine: Score calculated. Assigned to: **CRM Stage: Qualified**
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: KANBAN PIPELINE VIEW RECONCILE */}
          {sandboxStep === "pipeline" && (
            <div style={{ padding: "40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                  <span className="section-label" style={{ fontSize: "0.75rem", color: "var(--accent-gold)" }}>
                    Step 3 // Real-Time CRM Pipeline Reconcile
                  </span>
                  <h3 className="serif-display" style={{ fontSize: "1.8rem" }}>
                    Integrated <span className="editorial-italic">{demoIndustry} Database</span>
                  </h3>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleResetSandbox}>
                  <span>Reset Sandbox Form</span>
                </button>
              </div>

              <div className="sandbox-crm">
                {/* Stage 1: New Lead */}
                <div className="sandbox-crm-col">
                  <div className="sandbox-crm-title">New Lead</div>
                  <div className="sandbox-crm-card">
                    <h5>Sarah Jenkins</h5>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Value: $1,200 | Score: 88</p>
                  </div>
                  {leads.filter(l => l.name === formName && l.status === "New Lead").map(l => (
                    <div key={l.id} className="sandbox-crm-card" style={{ borderColor: "var(--accent-gold)" }}>
                      <h5>{l.name}</h5>
                      <p style={{ fontSize: "0.7rem", color: "var(--accent-gold)" }}>Value: ${l.value.toLocaleString()} | Score: {l.score}</p>
                      <span style={{ fontSize: "0.65rem", padding: "2px 6px", background: "var(--accent-gold-glow)", borderRadius: "4px", display: "inline-block", marginTop: "6px" }}>Just Added</span>
                    </div>
                  ))}
                </div>

                {/* Stage 2: Qualified */}
                <div className="sandbox-crm-col">
                  <div className="sandbox-crm-title">Qualified</div>
                  <div className="sandbox-crm-card">
                    <h5>Amelia Thorne</h5>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Value: $800 | Score: 85</p>
                  </div>
                  {leads.filter(l => l.name === formName && l.status === "Qualified").map(l => (
                    <div key={l.id} className="sandbox-crm-card" style={{ borderColor: "var(--accent-gold)" }}>
                      <h5>{l.name}</h5>
                      <p style={{ fontSize: "0.7rem", color: "var(--accent-gold)" }}>Value: ${l.value.toLocaleString()} | Score: {l.score}</p>
                      <span style={{ fontSize: "0.65rem", padding: "2px 6px", background: "var(--accent-gold-glow)", borderRadius: "4px", display: "inline-block", marginTop: "6px" }}>Just Added</span>
                    </div>
                  ))}
                </div>

                {/* Stage 3: Contacted */}
                <div className="sandbox-crm-col">
                  <div className="sandbox-crm-title">Contacted</div>
                  <div className="sandbox-crm-card">
                    <h5>David Miller</h5>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Value: $2,400 | Score: 95</p>
                  </div>
                </div>

                {/* Stage 4: Appointment Booked */}
                <div className="sandbox-crm-col">
                  <div className="sandbox-crm-title">Appointment Booked</div>
                  <div className="sandbox-crm-card">
                    <h5>Kunal Sharma</h5>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Value: $1,200 | Score: 90</p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "40px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", padding: "24px", borderRadius: "var(--radius-sm)", display: "flex", justifySpace: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "#F5F5F5", marginBottom: "4px" }}>
                    🚀 Experience the complete SaaS dashboard engine
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Access all 12 modules including real-time charts, active assistant messages, node-flow automations, and strategy schedulers.
                  </p>
                </div>
                <button className="btn btn-gold btn-sm" onClick={() => navigateTo("dashboard")}>
                  <span>Access Complete OS Portal</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}
