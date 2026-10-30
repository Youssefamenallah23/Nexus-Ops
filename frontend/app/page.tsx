"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion";
import { Box, FileSearch, Bot, Workflow, ShieldCheck, Microscope, Gauge, Lock, Pause, Play, ChevronDown } from "lucide-react";
import { PipelineFlow } from "@/components/landing/pipeline-flow";
import { ImpactChart } from "@/components/landing/impact-chart";
import { InteractivePipelineDemo } from "@/components/landing/interactive-pipeline-demo";
import { LandingMotion } from "@/components/landing/landing-motion";

const HubCanvas = dynamic(() => import("@/components/landing/grid-canvas").then(m => m.HubCanvas), { ssr: false });
const FEATURES = [
  { Icon: FileSearch, title: "Document intelligence", desc: "Quotes, invoices, and technical reports become structured records with field-level confidence." },
  { Icon: Bot, title: "Answers with a source", desc: "Ask the copilot about verified documents. Follow every answer back to its citations." },
  { Icon: Workflow, title: "Connected workflows", desc: "Signed webhooks dispatch approved work to n8n for automated routing and tracking." },
  { Icon: ShieldCheck, title: "Your decision comes first", desc: "The workflow pauses before consequential actions. Review, correct, or approve to continue." },
  { Icon: Microscope, title: "Every agent, observable", desc: "Inspect token usage, latency, and provider comparisons across individual model calls." },
  { Icon: Gauge, title: "Understand the impact", desc: "Explore time and cost projections with visible formulas and adjustable assumptions." },
];

export default function LandingPage() {
  const [paused, setPaused] = useState(true);
  const reducedMotion = useReducedMotionPreference();
  return (
    <main className="landing-page">
      <LandingMotion />
      <header className="landing-nav">
        <div className="landing-container nav-inner">
          <Link href="/" className="wordmark" aria-label="Nexus Ops home"><Box aria-hidden="true" /><span>Nexus <span className="wordmark-light">Ops</span></span></Link>
          <nav aria-label="Main navigation"><a href="#how-it-works">The platform</a><a href="#live-simulator">Live demo</a><Link href="/login" className="nav-signin">Sign in</Link></nav>
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-copy landing-container">
          <h1 data-hero-enter>Operations.<br />Under your control.</h1>
          <p data-hero-enter>Intelligent agents handle the paperwork. You make the decisions.</p>
          <div data-hero-enter className="hero-actions"><Link href="/login" className="premium-button">Open your workspace</Link><a href="#live-simulator" className="text-action">Explore the live demo</a></div>
        </div>
        <div className="hero-object">
          <HubCanvas paused={paused} />
        </div>
        <div className="hero-bottom landing-container"><span>Drag to rotate. Scroll to explore.</span><a href="#how-it-works" aria-label="Explore the platform"><ChevronDown aria-hidden="true" /></a><button type="button" disabled={Boolean(reducedMotion)} title={reducedMotion ? "Auto-rotation is disabled by your reduced-motion preference." : undefined} aria-pressed={!paused && !reducedMotion} aria-label={paused ? "Start auto-rotation" : "Pause auto-rotation"} onClick={() => setPaused(!paused)}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}<span>{reducedMotion ? "Motion off" : paused ? "Auto-rotate" : "Pause"}</span></button></div>
      </section>

      <section id="how-it-works" className="landing-section pipeline-section">
        <div className="landing-container">
          <div className="section-heading"><h2>From document<br />to done.</h2><p>Quotes. Intervention reports. Maintenance diagnostics. One traceable path from extraction to human approval.</p></div>
          <PipelineFlow />
          <div className="pipeline-caption"><ShieldCheck aria-hidden="true" /><p>State is saved at every checkpoint. Work resumes when a manager authorizes it.</p></div>
        </div>
      </section>

      <section id="live-simulator" className="landing-section demo-section">
        <div className="landing-container">
          <div className="section-heading"><h2>Put the pipeline<br />through its paces.</h2><p>Choose an operational payload. Watch the agents work, then take over at the authorization gate.</p></div>
          <div className="product-stage"><div className="product-stage-heading"><Box aria-hidden="true" /><span>Nexus Ops</span><span>Interactive demonstration</span></div><InteractivePipelineDemo /></div>
        </div>
      </section>

      <section className="landing-section capabilities-section">
        <div className="landing-container capabilities-layout">
          <div className="capabilities-title"><h2>Intelligence you<br />can inspect.</h2><p>Built for operations where every decision needs a reason.</p><Link href="/login" className="text-action">Explore the workspace</Link></div>
          <div className="capability-list">{FEATURES.map(({ Icon, title, desc }) => <article className="capability-row" key={title}><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{desc}</p></div></article>)}</div>
        </div>
      </section>

      <section className="landing-section impact-section"><div className="landing-container"><div className="section-heading"><h2>Make the impact<br />measurable.</h2><p>Compare manual and agent-assisted processing. Projections are simulated, with the assumptions in view.</p></div><div className="impact-stage"><ImpactChart /></div></div></section>

      <section className="landing-section governance-section"><div className="landing-container governance-inner"><Lock aria-hidden="true" /><h2>Authority stays<br />with your team.</h2><p>Role-based access. Signed webhooks. Recorded audit events. Original files retained.</p><Link href="/login" className="premium-button">Access the platform</Link><p className="demo-disclosure">Explore seeded documents, the copilot, and agent traces using synthetic demonstration data.</p></div></section>
      <footer className="landing-footer"><div className="landing-container"><Link href="/" className="wordmark"><Box aria-hidden="true" /><span>Nexus Ops</span></Link><p>Autonomous operations. Human oversight.</p><span>Synthetic demonstration data / Apache 2.0</span></div></footer>
    </main>
  );
}
