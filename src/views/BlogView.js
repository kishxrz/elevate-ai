"use client";

import React from "react";
import { useElevate } from "@/components/Context";
import { ArrowRight, BookOpen, Clock } from "lucide-react";

export default function BlogView() {
  const { navigateTo } = useElevate();

  const posts = [
    {
      title: "The 45-Second Rule: Why response delay is killing clinic bookings",
      category: "Healthcare Operations",
      readTime: "5 min read",
      date: "May 28, 2026",
      desc: "Medical patients looking for specialized strategy consults drop off by 80% if their text is not answered immediately. Here is how automatic pre-qualification scripts lock them in.",
      author: "Dr. Robert Chen"
    },
    {
      title: "From Raw Swatches to Bulk Exporters: How AI automates industrial RFQs",
      category: "Manufacturing",
      readTime: "8 min read",
      date: "May 22, 2026",
      desc: "Tannery managers and bulk leather exporters deal with timezone delays and complicated pricing requests. Learn how our instant quotation calculator automates negotiation.",
      author: "Rajesh Exports"
    },
    {
      title: "Decoding Buyer Intent: The mathematical score realtors use for site visits",
      category: "Real Estate Scale",
      readTime: "6 min read",
      date: "May 15, 2026",
      desc: "Stop wasting hours showing premium penthouses to brokers or unqualified tire-kickers. The 5 critical screening variables our AI uses to evaluate downpayment capacity.",
      author: "Vikram Sen"
    }
  ];

  return (
    <div style={{ paddingTop: "120px" }}>
      <section className="section-wrapper">
        <div className="section-header">
          <span className="section-label">Editorial Columns</span>
          <h2 className="section-title serif-display">
            Bespoke perspectives on <span className="editorial-italic">automated scaling</span>
          </h2>
          <p className="section-subtitle">
            Strategic insights on operational efficiency, lead scoring models, and conversion psychology.
          </p>
        </div>

        {/* Featured Editorial Post */}
        <div className="premium-card gold-glow" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginBottom: "60px", padding: "48px", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", gap: "16px", fontSize: "0.8rem", color: "var(--accent-gold)", textTransform: "uppercase", fontWeight: "600", marginBottom: "16px" }}>
              <span>★ Featured Essay</span>
              <span>•</span>
              <span>12 min read</span>
            </div>
            <h3 className="serif-display" style={{ fontSize: "2.2rem", marginBottom: "20px", lineHeight: "1.3" }}>
              The Death of the Chatbot: Why businesses are upgrading to <span className="editorial-italic">Growth Operating Systems</span>
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.7", marginBottom: "32px" }}>
              Passive Q&A widgets and generic automation tools do not qualify leads or build customer trust. The modern enterprise requires cohesive systems connecting active calendar bookings, database pipelines, and direct messaging channels instantly.
            </p>
            <button className="btn btn-gold btn-sm" onClick={() => navigateTo("demo")}>
              <span>Read Essay</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ background: "linear-gradient(135deg, #111111 0%, #171717 100%)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", height: "300px", display: "flex", alignItems: "center", justifyCenter: "center", position: "relative", overflow: "hidden", padding: "40px" }}>
            <div style={{ position: "absolute", top: "10%", left: "10%", width: "120%", height: "120%", border: "1px solid rgba(212,175,55,0.15)", borderRadius: "var(--radius-sm)", transform: "rotate(-12deg)", background: "rgba(0,0,0,0.4)" }}>
              <div style={{ padding: "24px", color: "var(--accent-gold)", fontSize: "0.8rem", fontFamily: "sans-serif" }}>
                <span>ELEVATE ENGINE DIAGNOSTIC // </span>
                <div style={{ marginTop: "16px", width: "80%", height: "2px", background: "var(--accent-gold)" }}></div>
                <p style={{ fontSize: "1.2rem", color: "#F5F5F5", marginTop: "24px", fontFamily: "serif", fontStyle: "italic" }}>
                  "Capture, score, book and close."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Blog Grid */}
        <div className="grid-3">
          {posts.map((post, idx) => (
            <div key={idx} className="premium-card" style={{ display: "flex", flexDirection: "column", justifyStyle: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                  <span>{post.category}</span>
                  <span>{post.date}</span>
                </div>
                <h4 className="serif-display" style={{ fontSize: "1.3rem", fontWeight: "500", marginBottom: "16px", lineHeight: "1.4" }}>
                  {post.title}
                </h4>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: "1.6", marginBottom: "24px" }}>
                  {post.desc}
                </p>
              </div>
              
              <div style={{ display: "flex", justifySpace: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "auto" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-primary)", fontWeight: "600" }}>By {post.author}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--accent-gold)", cursor: "pointer" }} onClick={() => navigateTo("demo")}>
                  <span>Read Post</span>
                  <ArrowRight size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
