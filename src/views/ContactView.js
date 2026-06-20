"use client";

import React, { useState } from "react";
import { useElevate } from "@/components/Context";
import { Phone, AlertCircle, Bot, Users, Ticket, Calendar, CheckCircle } from "lucide-react";

export default function ContactView() {
  const { 
    tickets, 
    createTicket, 
    bookAppointment, 
    demoIndustry 
  } = useElevate();

  // State for strategy call booking form
  const [aptName, setAptName] = useState("");
  const [aptEmail, setAptEmail] = useState("");
  const [aptPhone, setAptPhone] = useState("");
  const [aptType, setAptType] = useState("Orthopedic Medical Strategy");
  const [aptDate, setAptDate] = useState("2026-06-02");
  const [aptTime, setAptTime] = useState("04:00 PM");
  const [aptBookedSuccess, setAptBookedSuccess] = useState(false);

  // State for support ticket creation form
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("AI & Automations");
  const [ticketPriority, setTicketPriority] = useState("High");
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Simple state for instant AI support sandbox
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  const handleAptSubmit = async (e) => {
    e.preventDefault();
    if (!aptName || !aptEmail) return;
    
    try {
      await bookAppointment({
        clientName: aptName,
        email: aptEmail,
        phone: aptPhone || "+91 63743 85901",
        type: `${demoIndustry.toUpperCase()} Setup: ${aptType}`,
        date: aptDate,
        time: aptTime,
      });
      alert("Consultation booked and lead saved to Supabase successfully!");
      setAptBookedSuccess(true);
      setTimeout(() => {
        setAptBookedSuccess(false);
        setAptName("");
        setAptEmail("");
        setAptPhone("");
      }, 4000);
    } catch (err) {
      alert(`Error booking consultation: ${err.message || err}`);
    }
  };

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketSubject) return;

    createTicket({
      subject: ticketSubject,
      category: ticketCategory,
      priority: ticketPriority,
    });
    setTicketSuccess(true);
    setTicketSubject("");
    setTimeout(() => {
      setTicketSuccess(false);
    }, 4000);
  };

  const handleAiAsk = (e) => {
    e.preventDefault();
    if (!aiQuery) return;

    // Simulate AI knowledge base logic
    let answer = "Elevate AI's Knowledge Base answers instantly: For optimal setup, connect WhatsApp Business via the dashboard. Your configuration settings permit customized downpayments and automatic reminder schedules.";
    if (aiQuery.toLowerCase().includes("whatsapp")) {
      answer = "To set up WhatsApp Business, purchase the Growth or Scale Plan. In the dashboard's 'Integrations Center', click 'Connect WhatsApp Business API' and fill in your Meta Business Credentials. Custom automated triggers will initiate immediately.";
    } else if (aiQuery.toLowerCase().includes("pricing") || aiQuery.toLowerCase().includes("cost")) {
      answer = "Elevate AI offers: Starter ($49/mo for single CRM pipeline), Growth ($149/mo including AI lead scoring & WhatsApp integrations), Scale ($299/mo including priority support). Direct support can also be accessed via +91 63743 85901.";
    }
    setAiResponse(answer);
  };

  return (
    <div style={{ paddingTop: "120px" }}>
      <section className="section-wrapper">
        <div className="section-header">
          <span className="section-label">Premium Support Ecosystem</span>
          <h2 className="section-title serif-display">
            Talk to a <span className="editorial-italic">Growth Expert</span>
          </h2>
          <p className="section-subtitle">
            We position human assistance as a luxury business advisory. Receive immediate technical configuration support or strategic alignment calls.
          </p>
        </div>

        {/* AI vs Human Split panels */}
        <div className="grid-2" style={{ marginBottom: "60px" }}>
          
          {/* Left panel: Human Expert details */}
          <div className="premium-card gold-glow">
            <h3 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "20px", color: "var(--accent-gold)", display: "flex", alignItems: "center", gap: "10px" }}>
              <Users size={22} />
              <span>Human Assistance & Strategy</span>
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.7", marginBottom: "24px" }}>
              Our expert onboarding engineers help you sync API keys, configure WhatsApp scripts, and audit your conversion scores. Direct support is available during work hours.
            </p>

            <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "20px", borderRadius: "var(--radius-sm)", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <Phone size={18} style={{ color: "var(--accent-gold)" }} />
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: "600" }}>Strategic Hotline</h4>
                  <p style={{ fontSize: "0.95rem", color: "#F5F5F5", fontWeight: "600" }}>+91 63743 85901</p>
                </div>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                * Dedicated human priority line for Growth, Scale, and Enterprise plan subscribers.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <p>✓ <strong>Direct Callback:</strong> Request support callback within 15 minutes.</p>
              <p>✓ <strong>CRM Migration:</strong> We import your legacy contacts from HubSpot or Salesforce for free.</p>
            </div>
          </div>

          {/* Right panel: AI Assistant knowledge base */}
          <div className="premium-card">
            <h3 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "20px", color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "10px" }}>
              <Bot size={22} />
              <span>Instant AI Knowledge Base</span>
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.7", marginBottom: "20px" }}>
              Ask our instant AI Assistant technical configuration questions or lookup quick integrations docs.
            </p>

            <form onSubmit={handleAiAsk} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <input 
                type="text" 
                placeholder="Ask e.g. How to connect WhatsApp API or Pricing?" 
                value={aiQuery} 
                onChange={(e) => setAiQuery(e.target.value)}
                className="form-input"
                style={{ flexGrow: "1" }}
              />
              <button type="submit" className="btn btn-emerald btn-sm">
                <span>Ask AI</span>
              </button>
            </form>

            {aiResponse ? (
              <div style={{ background: "rgba(14, 138, 109, 0.05)", border: "1px solid rgba(14, 138, 109, 0.2)", padding: "16px", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                <strong>AI Knowledge Expert:</strong>
                <p style={{ marginTop: "8px" }}>{aiResponse}</p>
              </div>
            ) : (
              <div style={{ border: "1px dashed var(--border-color)", padding: "16px", borderRadius: "var(--radius-sm)", textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                AI Assistant offline until query is submitted. Ask about 'WhatsApp Business' for a tailored response.
              </div>
            )}
          </div>
        </div>

        {/* Strategy Call Booking & Ticket Creation Split grids */}
        <div className="contact-split">
          
          {/* Strategy Call Booking */}
          <div className="premium-card">
            <h3 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Calendar size={20} style={{ color: "var(--accent-gold)" }} />
              <span>Book Strategy Consultation</span>
            </h3>
            
            {aptBookedSuccess ? (
              <div style={{ background: "rgba(14, 138, 109, 0.05)", border: "1px solid var(--accent-emerald)", padding: "24px", borderRadius: "var(--radius-sm)", textAlign: "center", marginBottom: "20px" }}>
                <CheckCircle size={32} style={{ color: "var(--accent-emerald)", marginBottom: "12px", display: "inline-block" }} />
                <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#F5F5F5", marginBottom: "8px" }}>Strategy Consultation Reserved!</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Confirmation calendar invite emailed to your inbox. An AI Growth Lead has been created in your pipeline.
                </p>
              </div>
            ) : (
              <form onSubmit={handleAptSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter name" 
                    value={aptName}
                    onChange={(e) => setAptName(e.target.value)}
                    className="form-input" 
                    required 
                  />
                </div>
                <div className="grid-2" style={{ gap: "16px", marginBottom: "20px" }}>
                  <div>
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="name@company.com" 
                      value={aptEmail}
                      onChange={(e) => setAptEmail(e.target.value)}
                      className="form-input" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label">Phone Number</label>
                    <input 
                      type="text" 
                      placeholder="+91 98456 XXXXX" 
                      value={aptPhone}
                      onChange={(e) => setAptPhone(e.target.value)}
                      className="form-input" 
                    />
                  </div>
                </div>
                <div className="grid-2" style={{ gap: "16px", marginBottom: "20px" }}>
                  <div>
                    <label className="form-label">Date Preference</label>
                    <input 
                      type="date" 
                      value={aptDate}
                      onChange={(e) => setAptDate(e.target.value)}
                      className="form-input" 
                    />
                  </div>
                  <div>
                    <label className="form-label">Time Slot</label>
                    <select 
                      value={aptTime}
                      onChange={(e) => setAptTime(e.target.value)}
                      className="form-input"
                      style={{ background: "var(--bg-color)" }}
                    >
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                    </select>
                  </div>
                </div>
                
                <button type="submit" className="btn btn-gold" style={{ width: "100%" }}>
                  <span>Reserve Strategy Slot</span>
                </button>
              </form>
            )}
          </div>

          {/* Ticket System */}
          <div className="premium-card">
            <h3 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Ticket size={20} style={{ color: "var(--accent-emerald)" }} />
              <span>Submit Operations Ticket</span>
            </h3>

            {ticketSuccess && (
              <div style={{ background: "rgba(14, 138, 109, 0.05)", border: "1px solid var(--accent-emerald)", padding: "16px", borderRadius: "var(--radius-sm)", textAlign: "center", marginBottom: "20px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                ✓ Support ticket added successfully. Our support desk is routing this to a growth engineer immediately.
              </div>
            )}

            <form onSubmit={handleTicketSubmit} style={{ marginBottom: "32px" }}>
              <div className="form-group">
                <label className="form-label">Ticket Subject</label>
                <input 
                  type="text" 
                  placeholder="e.g. n8n webhook error or lead scoring adjustment" 
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="form-input" 
                  required 
                />
              </div>
              <div className="grid-2" style={{ gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label className="form-label">Category</label>
                  <select 
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="form-input"
                    style={{ background: "var(--bg-color)" }}
                  >
                    <option value="AI & Automations">AI & Automations</option>
                    <option value="Core CRM">Core CRM</option>
                    <option value="Billing & Payments">Billing & Payments</option>
                    <option value="Developer APIs">Developer APIs</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority Level</label>
                  <select 
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="form-input"
                    style={{ background: "var(--bg-color)" }}
                  >
                    <option value="Low">Low (Standard)</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (Urgent)</option>
                    <option value="Premium">Premium Growth OS</option>
                  </select>
                </div>
              </div>
              
              <button type="submit" className="btn btn-secondary" style={{ width: "100%" }}>
                <span>Create Support Ticket</span>
              </button>
            </form>

            <h4 style={{ fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", color: "var(--text-muted)", borderTop: "1px solid var(--border-color)", paddingTop: "20px", marginBottom: "16px" }}>
              Active Operations Tickets ({tickets.length})
            </h4>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {tickets.map((t) => (
                <div key={t.id} style={{ background: "var(--surface-color)", border: "1px solid var(--border-color)", padding: "12px 16px", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{t.id} • {t.category}</span>
                    <h5 style={{ fontSize: "0.8rem", fontWeight: "600", marginTop: "2px" }}>{t.subject}</h5>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ 
                      fontSize: "0.65rem", 
                      padding: "2px 8px", 
                      borderRadius: "10px",
                      background: t.priority === "Premium" || t.priority === "High" ? "var(--accent-gold-glow)" : "rgba(255,255,255,0.03)", 
                      color: t.priority === "Premium" || t.priority === "High" ? "var(--accent-gold)" : "var(--text-muted)" 
                    }}>
                      {t.priority}
                    </span>
                    <span style={{ 
                      fontSize: "0.65rem", 
                      fontWeight: "700", 
                      color: t.status === "Resolved" ? "var(--accent-emerald)" : "var(--accent-gold)" 
                    }}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
