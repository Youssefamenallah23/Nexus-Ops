"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot, FileSearch, Gauge, Microscope, ShieldCheck, Workflow } from "lucide-react";
import { HubCanvas } from "@/components/landing/grid-canvas";
import { PipelineFlow } from "@/components/landing/pipeline-flow";
import { ImpactChart } from "@/components/landing/impact-chart";
import { Magnetic, staggerContainer, staggerItem } from "@/components/landing/magnetic";

const FEATURES = [
  { Icon: FileSearch, title: "Document intelligence", desc: "PDFs, quotes, intervention reports classified and extracted into validated, structured fields â€” with confidence on every value." },
  { Icon: Bot, title: "Knowledge copilot", desc: "Ask anything. Answers come only from approved documents you can access, always with citations." },
  { Icon: Workflow, title: "n8n automation", desc: "HMAC-signed webhooks fire on approval: notifications, task routing, reminders. Every execution is recorded." },
  { Icon: ShieldCheck, title: "Human in the loop", desc: "The graph checkpoint waits. A person approves before anything consequential happens â€” enforced server-side." },
  { Icon: Microscope, title: "Agent observatory", desc: "Every agent call traced: provider, model, tokens, latency, confidence. Two providers compared on identical documents." },
  { Icon: Gauge, title: "Measurable impact", desc: "A transparent time-saved simulator with published assumptions â€” never fabricated business results." },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export default function LandingPage() {
  return (
    <main className="relative min-h-svh overflow-x-clip">
      {/* ================= hero ================= */}
      <section className="relative flex min-h-svh flex-col">
        <div className="absolute inset-0 z-0">
          <HubCanvas />
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#02070A]/70 via-transparent to-[#02070A]" />


        <nav className="z-20 flex items-center justify-between px-6 py-5 md:px-12">
          <span className="text-lg font-semibold tracking-tight">
            NEXUS<span className="text-primary"> OPS</span>
          </span>
          <Link href="/login"
            className="rounded-lg border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
            Sign in
          </Link>
        </nav>

        <div className="z-20 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="tnum mb-4 text-xs tracking-widest text-muted-foreground">
            AI WORKFLOW & OPERATIONS HUB
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.35, duration: 0.8 }}
            className="max-w-3xl text-4xl font-semibold leading-tight tracking-tighter drop-shadow-[0_2px_20px_rgba(2,7,10,0.9)] md:text-6xl">
            Repetitive operations,
            <br />
            <span className="text-primary">processed by agents.</span>
            <br />
            Approved by humans.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            NEXUS OPS turns supplier quotes, intervention reports and purchase requests
            into classified, validated, automatically routed workflows - with a person
            approving every consequential action.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Magnetic>
              <Link href="/login"
                className="group inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3 text-sm font-semibold text-[#02070a] shadow-[0_0_36px_-8px_rgba(2,151,222,0.7)] transition-shadow hover:shadow-[0_0_48px_-6px_rgba(2,151,222,0.9)]">
                Open the hub
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <Magnetic strength={0.25}>
              <a href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-[#02070a]/60 px-6 py-3 text-sm text-muted-foreground backdrop-blur transition-colors hover:border-primary hover:text-foreground">
                See how it works
              </a>
            </Magnetic>
          </motion.div>
        </div>

        <div className="tnum flex flex-wrap items-center justify-center gap-8 pb-8 text-xs text-muted-foreground">
          <span>MISTRAL LARGE 4</span>
          <span>GEMINI 3.5 FLASH-LITE</span>
          <span className="text-[var(--fault)]">HUMAN-IN-THE-LOOP</span>
          <span>PGVECTOR</span>
        </div>
      </section>

      {/* stats */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
          {[
            ["6", "specialized agents"],
            ["5", "document types routed"],
            ["100%", "audited decisions"],
            ["384-dim", "semantic search"],
          ].map(([v, l]) => (
            <div key={l} className="bg-card p-6 text-center">
              <div className="tnum text-3xl font-semibold text-primary">{v}</div>
              <div className="mt-1 text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* pipeline */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl font-semibold tracking-tight">How a document becomes a workflow</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Six stages, six checkpoints, one human gate. This is the actual LangGraph
            pipeline â€” checkpointed in Postgres, resumed on approval.
          </p>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="mt-10 rounded-xl border border-border bg-card/60 p-6">
          <PipelineFlow />
        </motion.div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <motion.h2 {...fadeUp} className="text-3xl font-semibold tracking-tight">Everything it does
        </motion.h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title} variants={staggerItem}
              className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <f.Icon className="size-6 text-primary transition-transform group-hover:scale-110" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>


      {/* impact chart */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl font-semibold tracking-tight">The business case, plotted</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            The dashboard computes estimated hours saved with a published formula and
            clearly labeled assumptions â€” the same simulator runs live in the app.
          </p>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="mt-10 rounded-xl border border-border bg-card/60 p-6">
          <ImpactChart />
        </motion.div>
      </section>
      {/* governance strip */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <motion.div {...fadeUp} className="rounded-xl border border-[var(--fault)]/30 bg-[var(--fault)]/5 p-8 text-center">
          <ShieldCheck className="mx-auto size-8 text-[var(--fault)]" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">Built responsible by default</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Role-based access enforced server-side. Every AI suggestion, edit, approval
            and automation logged. Original files retained. Simulated numbers labeled as
            simulated. Secrets never leave the environment.
          </p>
        </motion.div>
      </section>

      {/* final CTA */}
      <section className="relative mx-auto max-w-5xl px-6 pb-24 text-center">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl font-semibold tracking-tight">See it with real data</h2>
          <p className="mt-3 text-muted-foreground">
            Seeded synthetic operations: 22 documents, 3 projects, live agents.
          </p>
          <Link
            href="/login"
            className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-medium text-[#02070a] transition-transform hover:scale-[1.03]"
          >
            Launch NEXUS OPS
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        NEXUS OPS â€” portfolio project. All data is synthetic. Nothing here represents any real company.
      </footer>
    </main>
  );
}



