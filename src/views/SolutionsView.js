"use client";

import React from "react";
import { useElevate } from "@/components/Context";
import { Factory, ShieldPlus, Dumbbell, Building2, Layers, HeartPulse, Sparkles } from "lucide-react";

export default function SolutionsView() {
  const { navigateTo } = useElevate();

  const solutions = [
    {
      icon: <Factory />,
      title: "Manufacturers & Industrial Exporters",
      problem: "Long, manual RFQ email templates and delayed custom quote estimations cause buyers to go elsewhere.",
      solution: "Elevate AI auto-scans RFQ email requirements, estimates rough bill of materials automatically, and updates your CRM Pipeline for immediate approval.",
      roi: "40% increase in RFQ win rates"
    },
    {
      icon: <Layers />,
      title: "Leather & Textile Houses",
      problem: "Managing dozens of physical swatch samples and international export pipeline leads across WhatsApp is highly disorganized.",
      solution: "Sync WhatsApp Business API to auto-qualify leather grades requested, dispatch automated shipment tracking, and alert dispatchers.",
      roi: "Reduce manual shipment tracking administration by 75%"
    },
    {
      icon: <HeartPulse />,
      title: "Clinics & Medical Practices",
      problem: "Patients booking doctor consultations fail to show up, or book slots without filling medical pre-assessments.",
      solution: "Automatic WhatsApp pre-qualification scripts confirm patient severity, auto-verify insurance availability, and schedule reminder drips.",
      roi: "Decrease consultation no-show rates to under 3%"
    },
    {
      icon: <Dumbbell />,
      title: "Gyms & Wellness Centers",
      problem: "Facebook membership campaign leads sit cold over the weekend, never booking a trial session.",
      solution: "Instant WhatsApp drips trigger 45 seconds after form submission, offering free member passes and scheduling fitness assessments.",
      roi: "Double trial class bookings in 30 days"
    },
    {
      icon: <Building2 />,
      title: "Real Estate & Agencies",
      problem: "Reps spend hours qualifying low-budget buyers who aren't ready to buy or relocators with low intent.",
      solution: "AI scores realtors based on budget, downpayment capacity, and property type preferences, auto-matching listing sheets.",
      roi: "3.5x increase in site visit closure rates"
    },
    {
      icon: <Sparkles />,
      title: "Coaches, Consultants & SMBs",
      problem: "Leads book strategy calls without completing discovery forms, leading to unproductive calls.",
      solution: "Integrated strategy call scheduler validates leads automatically before confirmation, canceling non-qualified bookings.",
      roi: "Save 15+ hours of weekly meeting slots"
    }
  ];

  return (
    <div style={{ paddingTop: "120px" }}>
      <section className="section-wrapper">
        <div className="section-header">
          <span className="section-label">Outcome-Focused Frameworks</span>
          <h2 className="section-title serif-display">
            Tailored operating structures for <span className="editorial-italic">high-growth industries</span>
          </h2>
          <p className="section-subtitle">
            Deploy pre-built custom database pipelines and message templates configured specifically for your unique industry workflow.
          </p>
        </div>

        <div className="grid-3" style={{ marginBottom: "60px" }}>
          {solutions.map((s, i) => (
            <div key={i} className="premium-card">
              <div style={{ width: "42px", height: "42px", borderRadius: "4px", background: "var(--accent-gold-glow)", display: "flex", alignItems: "center", justifyCenter: "center", color: "var(--accent-gold)", marginBottom: "20px", padding: "10px" }}>
                {s.icon}
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px" }}>{s.title}</h3>
              
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", marginBottom: "4px" }}>❌ The Bottleneck</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: "1.5" }}>{s.problem}</p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--accent-gold)", textTransform: "uppercase", fontWeight: "600", marginBottom: "4px" }}>✨ Elevate Workflow</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>{s.solution}</p>
              </div>

              <div style={{ fontSize: "0.8rem", color: "var(--accent-emerald)", fontWeight: "700", borderTop: "1px solid var(--border-color)", paddingTop: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                🎯 Projected ROI: {s.roi}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <button className="btn btn-gold" onClick={() => navigateTo("demo")}>
            <span>Test Your Industry Template</span>
          </button>
        </div>
      </section>
    </div>
  );
}
