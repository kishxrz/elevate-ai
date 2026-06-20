"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeIndianRupee,
  Bot,
  BrainCircuit,
  Building2,
  Check,
  ChevronRight,
  CircleDashed,
  Clock3,
  Headset,
  LineChart,
  MessageSquareText,
  MoveRight,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Workflow,
} from "lucide-react";

const reveal = {
  hidden: { opacity: 0, y: 36 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

const industries = [
  {
    id: "clinics",
    label: "Clinics",
    title: "Patients qualified before your front desk calls back",
    description:
      "AI triages urgency, availability, and treatment intent, then books the right consultation path without admin lag.",
    metrics: ["42 min to 6 min first response", "31% more bookings", "24/7 follow-up coverage"],
    conversation: [
      { type: "brand", text: "Hi Ananya, are you looking for an orthopedic consult this week?" },
      { type: "user", text: "Yes, lower back pain for 3 months. Evening works best." },
      { type: "signal", text: "AI marked as high urgency and suggested spine consultation." },
    ],
  },
  {
    id: "real-estate",
    label: "Real Estate",
    title: "High-intent buyers routed to your best closers instantly",
    description:
      "Budget, geography, inventory fit, and viewing readiness become live scoring signals across the pipeline.",
    metrics: ["2.3x faster site visits", "19% more qualified tours", "Luxury buyer routing"],
    conversation: [
      { type: "brand", text: "Looking for an end-use or investment property?" },
      { type: "user", text: "End-use. 4BHK, ₹2.5Cr budget, moving in 90 days." },
      { type: "signal", text: "AI assigned priority score 96 and triggered concierge callback." },
    ],
  },
  {
    id: "fitness",
    label: "Fitness",
    title: "Membership pipelines that feel personal at scale",
    description:
      "Trial leads get coached through qualification, booking, and reminders without the WhatsApp chaos that slows teams down.",
    metrics: ["3x more assessments booked", "48% fewer no-shows", "Automated renewal nudges"],
    conversation: [
      { type: "brand", text: "Would you like fat loss coaching, strength, or general fitness?" },
      { type: "user", text: "Strength. I can train at 6am and want a trainer." },
      { type: "signal", text: "AI moved lead to premium onboarding and sent trainer slot options." },
    ],
  },
];

const capabilities = [
  {
    icon: BrainCircuit,
    title: "AI qualification engine",
    text: "Reads intent, budget, urgency, and next-best-action signals before a human even opens the thread.",
  },
  {
    icon: MessageSquareText,
    title: "WhatsApp and inbox orchestration",
    text: "Every touchpoint stays on-brand across WhatsApp, forms, and email with governed follow-up logic.",
  },
  {
    icon: Workflow,
    title: "Revenue workflow automation",
    text: "Lead scoring, reminders, assignment logic, and booking steps run as one elegant operating layer.",
  },
  {
    icon: LineChart,
    title: "Executive analytics",
    text: "Track response velocity, pipeline value, conversion lift, and staff efficiency in a board-ready view.",
  },
];

const results = [
  { value: "37%", label: "lift in qualified pipeline volume" },
  { value: "4.8x", label: "faster first-response performance" },
  { value: "18 hrs", label: "weekly admin time returned to teams" },
];

const faqs = [
  {
    q: "Is Elevate AI a CRM, an AI agent, or an automation platform?",
    a: "It is a growth operating system that combines all three. The point is less tool sprawl, tighter qualification, and a far better conversion rhythm.",
  },
  {
    q: "Can this work with an existing sales team and workflow?",
    a: "Yes. Elevate AI is designed to slot into existing lead flows while improving response speed, assignment logic, and reporting without forcing a team reset.",
  },
  {
    q: "What happens during onboarding?",
    a: "We configure channels, qualification rules, routing, and reporting with human support. Implementation help is part of the premium experience, not an afterthought.",
  },
  {
    q: "Do you support high-touch industries with complex lead qualification?",
    a: "That is exactly where the product shines. Clinics, real estate, premium fitness, and similar service businesses benefit the most from structured qualification and fast follow-up.",
  },
];

function Reveal({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      className={className}
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export default function HomeView() {
  const [activeIndustry, setActiveIndustry] = useState(industries[0].id);
  const [openFaq, setOpenFaq] = useState(0);
  const [spotlight, setSpotlight] = useState({ x: 50, y: 32 });

  const industry = useMemo(
    () => industries.find((item) => item.id === activeIndustry) ?? industries[0],
    [activeIndustry]
  );

  return (
    <div id="top" className="page-shell">
      <section
        className="hero"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setSpotlight({
            x: ((event.clientX - rect.left) / rect.width) * 100,
            y: ((event.clientY - rect.top) / rect.height) * 100,
          });
        }}
        style={{
          "--spotlight-x": `${spotlight.x}%`,
          "--spotlight-y": `${spotlight.y}%`,
        }}
      >
        <div className="hero-noise" />
        <div className="hero-mesh mesh-a" />
        <div className="hero-mesh mesh-b" />
        <div className="hero-mesh mesh-c" />

        <div className="hero-copy">
          <Reveal>
            <div className="eyebrow-pill">
              <Sparkles size={14} />
              Premium AI revenue infrastructure
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="hero-title">
              The Growth Operating System
              <br />
              for businesses that refuse
              <br />
              to scale slowly.
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="hero-kicker">
              <span>Capture.</span>
              <span>Qualify.</span>
              <span>Convert.</span>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="hero-subtitle">Without hiring more staff.</p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="hero-actions">
              <a className="primary-button" href="#sandbox">
                Enter the sandbox
                <ArrowRight size={16} />
              </a>
              <a className="secondary-button" href="#support">
                Speak to a human
              </a>
            </div>
          </Reveal>
        </div>

        <div className="hero-visuals">
          <motion.div
            className="floating-panel crm-panel"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="panel-topline">
              <span>Pipeline OS</span>
              <span>Live</span>
            </div>
            <div className="crm-columns">
              <div>
                <p>New</p>
                <article>
                  <strong>Arya Dental</strong>
                  <span>Score 91</span>
                </article>
                <article>
                  <strong>Urban Strength</strong>
                  <span>Score 76</span>
                </article>
              </div>
              <div>
                <p>Qualified</p>
                <article className="gold-border">
                  <strong>Skyline Estates</strong>
                  <span>₹2.5Cr buyer</span>
                </article>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="floating-panel chat-panel"
            animate={{ y: [0, 10, 0], rotate: [0, 1, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="panel-topline">
              <span>WhatsApp Qualification</span>
              <span>45 sec</span>
            </div>
            <div className="chat-stack">
              <div className="chat-bubble brand">What budget range should we optimize for?</div>
              <div className="chat-bubble user">₹18L annual membership revenue target.</div>
              <div className="chat-bubble signal">AI recommended premium nurture + callback priority.</div>
            </div>
          </motion.div>

          <motion.div
            className="floating-panel analytics-panel"
            animate={{ y: [0, -8, 0], x: [0, -4, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="panel-topline">
              <span>Executive Analytics</span>
              <TrendingUp size={14} />
            </div>
            <div className="analytics-metric">
              <div>
                <strong>+37%</strong>
                <span>conversion lift</span>
              </div>
              <div>
                <strong>06m</strong>
                <span>median response time</span>
              </div>
            </div>
            <div className="chart-bars">
              <span style={{ height: "44%" }} />
              <span style={{ height: "68%" }} />
              <span style={{ height: "57%" }} />
              <span style={{ height: "84%" }} />
              <span style={{ height: "94%" }} />
            </div>
          </motion.div>
        </div>
      </section>

      <section id="industries" className="logo-strip section-band">
        <Reveal className="section-copy centered">
          <p className="eyebrow">Trusted industries</p>
          <h2>Built for high-consideration businesses where speed and polish directly shape revenue.</h2>
        </Reveal>
        <div className="industry-rail">
          {["Clinics", "Real Estate", "Fitness", "Luxury Retail", "Professional Services"].map((item) => (
            <motion.div
              key={item}
              className="industry-pill"
              whileHover={{ y: -4, borderColor: "rgba(214, 178, 74, 0.55)" }}
            >
              {item}
            </motion.div>
          ))}
        </div>
      </section>

      <section id="pipeline" className="section-band">
        <div className="section-grid pipeline-layout">
          <Reveal className="section-copy">
            <p className="eyebrow">AI pipeline visualization</p>
            <h2>Every inquiry enters a living system that decides what happens next.</h2>
            <p>
              Instead of static forms and delayed handoffs, Elevate AI turns response logic,
              qualification, routing, and conversion signals into one fluid operating layer.
            </p>
          </Reveal>

          <Reveal className="pipeline-card" delay={0.1}>
            <div className="pipeline-node-row">
              <article className="pipeline-node">
                <CircleDashed size={18} />
                <strong>Capture</strong>
                <span>Forms, WhatsApp, inbound campaigns</span>
              </article>
              <span className="pipeline-link" />
              <article className="pipeline-node">
                <Bot size={18} />
                <strong>Qualify</strong>
                <span>Intent, urgency, budget, fit</span>
              </article>
            </div>
            <div className="pipeline-node-row">
              <article className="pipeline-node">
                <Workflow size={18} />
                <strong>Route</strong>
                <span>Assign, book, nurture, escalate</span>
              </article>
              <span className="pipeline-link" />
              <article className="pipeline-node highlight">
                <LineChart size={18} />
                <strong>Convert</strong>
                <span>Track value, velocity, and win rate</span>
              </article>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-band">
        <Reveal className="section-copy centered">
          <p className="eyebrow">Problem vs solution</p>
          <h2>The old way leaks intent. The new way compounds it.</h2>
        </Reveal>

        <div className="comparison-grid">
          <Reveal className="comparison-panel muted" delay={0.05}>
            <p className="comparison-label">Manual stack</p>
            <h3>Slow, scattered, and easy to outgrow</h3>
            <ul>
              <li><Clock3 size={16} /> Leads wait hours for a first reply</li>
              <li><MessageSquareText size={16} /> Channels break context across staff</li>
              <li><Building2 size={16} /> High-value prospects get buried in admin work</li>
            </ul>
          </Reveal>

          <Reveal className="comparison-panel elevated" delay={0.1}>
            <p className="comparison-label">Elevate AI</p>
            <h3>Fast, elegant, and designed to scale premium experiences</h3>
            <ul>
              <li><Check size={16} /> AI answers and qualifies in seconds</li>
              <li><ShieldCheck size={16} /> One governed pipeline across every touchpoint</li>
              <li><BadgeIndianRupee size={16} /> Staff focus shifts to closable revenue</li>
            </ul>
          </Reveal>
        </div>
      </section>

      <section id="platform" className="section-band">
        <Reveal className="section-copy centered">
          <p className="eyebrow">Core platform capabilities</p>
          <h2>A luxury front-end for a very practical growth machine.</h2>
        </Reveal>

        <div className="capability-grid">
          {capabilities.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={index * 0.05}>
                <motion.article className="capability-card" whileHover={{ y: -8 }}>
                  <div className="capability-icon">
                    <Icon size={18} />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </motion.article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="section-band">
        <div className="section-grid demo-layout">
          <Reveal className="section-copy">
            <p className="eyebrow">Interactive industry demos</p>
            <h2>Choose an industry and preview how the operating system adapts.</h2>
            <p>
              The core engine stays consistent, but the scripts, scoring, and routing
              flex around how your team actually sells.
            </p>
            <div className="demo-tabs">
              {industries.map((item) => (
                <button
                  key={item.id}
                  className={item.id === activeIndustry ? "active" : ""}
                  onClick={() => setActiveIndustry(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal className="demo-stage" delay={0.1}>
            <div className="demo-card">
              <p className="demo-label">{industry.label}</p>
              <h3>{industry.title}</h3>
              <p>{industry.description}</p>
              <div className="metric-row">
                {industry.metrics.map((metric) => (
                  <span key={metric}>{metric}</span>
                ))}
              </div>
            </div>

            <div className="phone-shell">
              {industry.conversation.map((line) => (
                <div key={line.text} className={`chat-bubble ${line.type}`}>
                  {line.text}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="sandbox" className="section-band">
        <div className="section-grid sandbox-layout">
          <Reveal className="section-copy">
            <p className="eyebrow">Sandbox experience</p>
            <h2>A tactile preview of the operating system in motion.</h2>
            <p>
              This is where the product stops feeling like a brochure and starts
              feeling like software your team wants to live in.
            </p>
            <a className="inline-link" href="#support">
              Book guided onboarding
              <MoveRight size={14} />
            </a>
          </Reveal>

          <Reveal className="sandbox-board" delay={0.1}>
            <div className="sandbox-column">
              <header>Captured</header>
              <article>
                <strong>Oakridge Dental</strong>
                <span>Website lead · Score 74</span>
              </article>
              <article>
                <strong>Prime Habitat</strong>
                <span>WhatsApp · Score 88</span>
              </article>
            </div>
            <div className="sandbox-column">
              <header>Qualified</header>
              <article className="gold-border">
                <strong>Skyline Heights</strong>
                <span>4BHK site visit requested</span>
              </article>
              <article>
                <strong>Lift Lab Fitness</strong>
                <span>Premium trainer consult booked</span>
              </article>
            </div>
            <div className="sandbox-column">
              <header>Converted</header>
              <article className="emerald-border">
                <strong>Arbor Clinic</strong>
                <span>Consultation booked · ₹48,000 value</span>
              </article>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="results" className="section-band">
        <Reveal className="section-copy centered">
          <p className="eyebrow">Results showcase</p>
          <h2>Designed to move revenue metrics, not just aesthetics.</h2>
        </Reveal>

        <div className="results-grid">
          {results.map((item, index) => (
            <Reveal key={item.label} delay={index * 0.05}>
              <motion.article className="result-card" whileHover={{ y: -6 }}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="section-band">
        <Reveal className="section-copy centered">
          <p className="eyebrow">FAQ</p>
          <h2>Everything serious buyers usually ask before they commit.</h2>
        </Reveal>

        <div className="faq-list">
          {faqs.map((item, index) => (
            <Reveal key={item.q} delay={index * 0.04}>
              <motion.button
                className="faq-item"
                type="button"
                onClick={() => setOpenFaq(index === openFaq ? -1 : index)}
                whileHover={{ borderColor: "rgba(214, 178, 74, 0.38)" }}
              >
                <div className="faq-head">
                  <span>{item.q}</span>
                  <ChevronRight
                    size={16}
                    className={index === openFaq ? "faq-open" : ""}
                  />
                </div>
                {index === openFaq && <p>{item.a}</p>}
              </motion.button>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="support" className="section-band support-section">
        <Reveal className="support-card">
          <div className="support-copy">
            <p className="eyebrow">Human support</p>
            <h2>Premium onboarding support. Human assistance for implementation and setup.</h2>
            <p>
              We help configure the operating system around your business model,
              team workflow, and revenue goals so adoption feels calm and immediate.
            </p>
          </div>

          <div className="support-actions">
            <a className="support-phone" href="tel:+916374385901">
              <PhoneCall size={18} />
              +91 63743 85901
            </a>
            <div className="support-meta">
              <span><Headset size={15} /> Guided implementation</span>
              <span><Star size={15} /> Premium setup assistance</span>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
