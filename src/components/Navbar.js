"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, LayoutDashboard, Menu, Sparkles } from "lucide-react";
import { useElevate } from "./Context";

const navItems = [
  { label: "Overview", view: "home" },
  { label: "Capabilities", view: "features" },
  { label: "Solutions", view: "solutions" },
  { label: "Sandbox Demo", view: "demo" },
  { label: "Pricing", view: "pricing" },
  { label: "Editorial", view: "blog" },
  { label: "Support", view: "contact" },
];

export default function Navbar() {
  const { currentView, navigateTo } = useElevate();

  return (
    <motion.header
      className="site-nav-shell"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="site-nav">
        <button
          className="site-brand button-reset"
          onClick={() => navigateTo("home")}
          aria-label="Elevate AI home"
          type="button"
        >
          <span className="site-brand-mark">
            <Sparkles size={14} />
          </span>
          <span className="site-brand-text">
            ELEVATE <em>AI</em>
          </span>
        </button>

        <nav className="site-nav-links" aria-label="Primary">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`button-reset nav-link-button ${currentView === item.view ? "is-active" : ""}`}
              onClick={() => navigateTo(item.view)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="site-nav-actions">
          <button
            className="nav-chip mobile-only button-reset"
            type="button"
            onClick={() => navigateTo("home")}
            aria-label="Back to homepage"
          >
            <Menu size={16} />
          </button>
          <button
            className="nav-chip button-reset"
            type="button"
            onClick={() => navigateTo("contact")}
          >
            Human Support
          </button>
          <button
            className="nav-chip desktop-only button-reset"
            type="button"
            onClick={() => navigateTo("demo")}
          >
            Explore Sandbox
            <ArrowUpRight size={14} />
          </button>
          <button
            className="nav-cta button-reset"
            type="button"
            onClick={() => navigateTo("dashboard", "overview")}
          >
            Launch OS
            <LayoutDashboard size={14} />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
