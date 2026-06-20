"use client";

import React from "react";
import { useElevate } from "@/components/Context";
import { Zap, MessageSquare, BarChart2, ShieldCheck, Mail, Sliders, Smartphone, CheckSquare } from "lucide-react";

export default function FeaturesView() {
  const { navigateTo } = useElevate();

  const features = [
    {
      icon: <Zap />,
      title: "AI Lead Qualification Engine",
      desc: "Automatically engages cold/warm inquiries, reviews user parameters (e.g. business type, budget, urgency), and scores them instantly between 1 and 100.",
      outcome: "Increases average lead quality scores by 55%"
    },
    {
      icon: <CheckSquare />,
      title: "CRM Kanban Pipeline",
      desc: "Organizes leads into fluid drag-and-drop columns: New, Qualified, Contacted, Interested, Appointment Booked, Won, and Lost. Complete with AI summary cards.",
      outcome: "Eliminates pipeline blindspots entirely"
    },
    {
      icon: <MessageSquare />,
      title: "WhatsApp API Automation",
      desc: "Sends instant, natural conversational flows to confirm member details, qualify doctor appointments, or confirm factory specifications immediately.",
      outcome: "Achieves an average 98% open rate"
    },
    {
      icon: <Mail />,
      title: "Gmail & Outlook Synchronization",
      desc: "Automatically logs incoming client email conversations directly into the specific CRM contact card. No copy-pasting email threads.",
      outcome: "Reduces administrative load by 4 hours daily"
    },
    {
      icon: <BarChart2 />,
      title: "Analytical Growth Center",
      desc: "Monitors pipeline velocity, customer acquisition cost (CAC), AI script reply ratios, and total active revenue pipeline estimates automatically.",
      outcome: "Provides direct, data-backed strategic clarity"
    },
    {
      icon: <Sliders />,
      title: "Node Automation Architect",
      desc: "Design complex logical automation paths (e.g. Lead submitted ➔ AI score ➔ WhatsApp notify ➔ Calendar sync) using an intuitive visual map.",
      outcome: "Full automated operational efficiency"
    }
  ];

  return (
    <div style={{ paddingTop: "120px" }}>
      <section className="section-wrapper">
        <div className="section-header">
          <span className="section-label">System Capabilities</span>
          <h2 className="section-title serif-display">
            A cohesive suite of <span className="editorial-italic">revenue accelerators</span>
          </h2>
          <p className="section-subtitle">
            Every feature is engineered to turn casual inquiries into high-value repeat customers automatically.
          </p>
        </div>

        <div className="grid-3" style={{ marginBottom: "80px" }}>
          {features.map((f, i) => (
            <div key={i} className="premium-card">
              <div style={{ width: "42px", height: "42px", borderRadius: "4px", background: "var(--accent-gold-glow)", display: "flex", alignItems: "center", justifyCenter: "center", color: "var(--accent-gold)", marginBottom: "20px", padding: "10px" }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "12px" }}>{f.title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.6", marginBottom: "16px" }}>{f.desc}</p>
              <div style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", fontWeight: "600", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                🎯 Outcome: {f.outcome}
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic feature highlight */}
        <div className="premium-card gold-glow" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", alignItems: "center", padding: "48px" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--accent-gold)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "12px" }}>
              ENTERPRISE-GRADE CAPABILITY
            </span>
            <h3 className="serif-display" style={{ fontSize: "2rem", marginBottom: "16px" }}>
              AI Sales Copywriting & <span className="editorial-italic">Conversational Nurturing</span>
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.7", marginBottom: "24px" }}>
              Elevate AI does not simply qualification; it generates bespoke WhatsApp and email drafts customized to each prospect's specific queries, matching your brand tone flawlessly.
            </p>
            <button className="btn btn-gold btn-sm" onClick={() => navigateTo("demo")}>
              <span>Try Sandbox Sandbox</span>
            </button>
          </div>
          <div style={{ background: "#080808", border: "1px solid var(--border-color)", padding: "24px", borderRadius: "var(--radius-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "16px" }}>
              <span>AI AGENT ACTIVITY LOG</span>
              <span style={{ color: "var(--accent-emerald)" }}>ACTIVE SCANNING</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", padding: "12px", borderRadius: "4px" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--accent-gold)" }}>Incoming WhatsApp message: </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>"Hi, I want to book a VIP slot at back clinic. Budget is 1500 USD, needs to start this week."</p>
              </div>
              <div style={{ background: "rgba(14, 138, 109, 0.03)", border: "1px solid rgba(14, 138, 109, 0.2)", padding: "12px", borderRadius: "4px" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--accent-emerald)" }}>AI Auto-Response Drafted: </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>"Hello Amelia! We have booked an orthopedic strategy session for you on Tuesday at 4 PM. Pre-consultation form has been texted. Welcome to Back Specialists!"</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
