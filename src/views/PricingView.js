"use client";

import React from "react";
import { useElevate } from "@/components/Context";
import { Check } from "lucide-react";

export default function PricingView() {
  const { navigateTo } = useElevate();

  const tiers = [
    {
      name: "Free Sandbox",
      price: "$0",
      desc: "Simulate qualification scripts and test lead pipeline structures with no setup fee.",
      features: [
        "Create up to 10 mock leads",
        "Test 1 Active Sandbox Industry",
        "CRM Kanban Stage drag-simulation",
        "Bespoke SVG charts mockup",
        "Standard support tickets"
      ],
      actionText: "Try Sandbox Sandbox",
      popular: false,
      onClick: () => navigateTo("demo")
    },
    {
      name: "Starter Plan",
      price: "$49",
      period: "/ mo",
      desc: "Essential AI capture & CRM tools engineered for single-practitioner service setups.",
      features: [
        "Capture up to 500 leads/mo",
        "1 Active CRM Kanban Pipeline",
        "AI Chatbot assistant template",
        "Gmail email integration",
        "Standard weekly conversion charts"
      ],
      actionText: "Deploy Starter Tier",
      popular: false,
      onClick: () => navigateTo("dashboard")
    },
    {
      name: "Growth Tier",
      price: "$149",
      period: "/ mo",
      desc: "Our flagship operational operating system that runs custom followups on auto-pilot.",
      features: [
        "Capture up to 5,000 leads/mo",
        "Custom Lead Scoring models",
        "AI WhatsApp Qualification script",
        "Google Calendar booking sync",
        "Bespoke analytics diagnostic center",
        "API Key developer console sync"
      ],
      actionText: "Launch Growth OS",
      popular: true,
      onClick: () => navigateTo("dashboard")
    },
    {
      name: "Scale Plan",
      price: "$299",
      period: "/ mo",
      desc: "High-volume operational architecture designed for clinics, real estate, and factories.",
      features: [
        "Unlimited monthly leads",
        "Multi-agent AI Sales teams",
        "Premium Razorpay portal webhook",
        "Personalized email automation sequences",
        "Monthly strategy audit by growth experts",
        "Direct ticket prioritization triage"
      ],
      actionText: "Deploy Scale System",
      popular: false,
      onClick: () => navigateTo("dashboard")
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      desc: "Bespoke system integrations and dedicated human account engineers for corporations.",
      features: [
        "Infinite system databases",
        "n8n dedicated server configurations",
        "Custom LLM fine-tuning",
        "HIPAA / GDPR medical compliance",
        "24/7 dedicated support phone hotline",
        "Weekly pipeline efficiency audits"
      ],
      actionText: "Consult Enterprise Expert",
      popular: false,
      onClick: () => navigateTo("contact")
    }
  ];

  return (
    <div style={{ paddingTop: "120px" }}>
      <section className="section-wrapper">
        <div className="section-header">
          <span className="section-label">Predictable Outcome Pricing</span>
          <h2 className="section-title serif-display">
            A premium investment in <span className="editorial-italic">automated growth</span>
          </h2>
          <p className="section-subtitle">
            No complicated technical jargon or hidden limits. Choose a volume-tier aligned to your active pipeline demands.
          </p>
        </div>

        <div className="pricing-grid">
          {tiers.map((t, idx) => (
            <div key={idx} className={`pricing-card ${t.popular ? "popular" : ""}`}>
              {t.popular && <span className="popular-badge">Most Popular</span>}
              <span className="pricing-tier">{t.name}</span>
              <div className="pricing-price">
                <span>{t.price}</span>
                {t.period && <span style={{ fontSize: "1rem", color: "var(--text-muted)", marginLeft: "4px" }}>{t.period}</span>}
              </div>
              <p className="pricing-desc">{t.desc}</p>
              
              <ul className="pricing-features">
                {t.features.map((f, i) => (
                  <li key={i}>
                    <Check size={14} style={{ color: t.popular ? "var(--accent-gold)" : "var(--accent-emerald)" }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button 
                className={`btn ${t.popular ? "btn-gold" : "btn-secondary"}`}
                onClick={t.onClick}
                style={{ width: "100%", marginTop: "auto" }}
              >
                <span>{t.actionText}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Money back assurance */}
        <div className="premium-card" style={{ marginTop: "60px", textAlign: "center", border: "1px dashed var(--border-color)", padding: "32px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "8px" }}>
            🛡️ Risk-Free Growth Onboarding
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "600px", margin: "0 auto", lineHeight: "1.6" }}>
            Every plan includes a 14-day full satisfaction refund. If our AI qualifier does not immediately increase your qualified prospect booking rate within two weeks, simply drop us a line or call +91 63743 85901 for an immediate return.
          </p>
        </div>
      </section>
    </div>
  );
}
