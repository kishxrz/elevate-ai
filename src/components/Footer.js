"use client";

import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { useElevate } from "./Context";

const footerColumns = [
  {
    title: "Platform",
    links: [
      { label: "Growth OS", view: "home" },
      { label: "Capabilities", view: "features" },
      { label: "Sandbox", view: "demo" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Solutions", view: "solutions" },
      { label: "Pricing", view: "pricing" },
      { label: "Editorial", view: "blog" },
    ],
  },
  {
    title: "Concierge",
    links: [
      { label: "Human Support", view: "contact" },
      { label: "Phone", href: "tel:+916374385901" },
      { label: "Setup Assistance", view: "contact" },
    ],
  },
];

export default function Footer() {
  const { navigateTo } = useElevate();

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-intro">
          <p className="eyebrow">Elevate AI</p>
          <h2>Revenue infrastructure with luxury-grade product polish.</h2>
          <p>
            Capture, qualify, and convert with a growth operating system built to
            feel as premium as the businesses it represents.
          </p>
          <a className="footer-contact" href="tel:+916374385901">
            <ShieldCheck size={16} />
            +91 63743 85901
          </a>
        </div>

        {footerColumns.map((column) => (
          <div key={column.title} className="footer-column">
            <p>{column.title}</p>
            {column.links.map((link) =>
              link.href ? (
                <a key={link.label} href={link.href} className="footer-link">
                  {link.label}
                  <ArrowUpRight size={13} />
                </a>
              ) : (
                <button
                  key={link.label}
                  type="button"
                  className="footer-link button-reset"
                  onClick={() => navigateTo(link.view)}
                >
                  {link.label}
                  <ArrowUpRight size={13} />
                </button>
              )
            )}
          </div>
        ))}
      </div>

      <div className="footer-bar">
        <span>© 2026 Elevate AI. Premium onboarding and implementation support included.</span>
        <span>Designed for ambitious operators across clinics, real estate, fitness, and high-value sales.</span>
      </div>
    </footer>
  );
}
