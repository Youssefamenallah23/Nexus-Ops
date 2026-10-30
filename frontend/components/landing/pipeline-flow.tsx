"use client";

import { motion } from "framer-motion";
import { Bot, FileUp, ShieldQuestion, Sparkles, UserCheck, Workflow } from "lucide-react";
import { staggerContainer, staggerItem } from "./magnetic";

const STAGES = [
  { Icon: FileUp, label: "Upload", desc: "Supplier quotes, purchase requests, intervention and maintenance reports, meeting minutes — PDF, DOCX, TXT, CSV.", accent: false },
  { Icon: Bot, label: "Classification Agent", desc: "Mistral Large 4 reads the document and decides: type, owning department, priority — with a confidence score.", accent: false },
  { Icon: Sparkles, label: "Intelligence Agent", desc: "Extracts supplier, reference, amount, dates into validated structured fields. Every value carries its confidence.", accent: false },
  { Icon: ShieldQuestion, label: "QA Agent", desc: "Deterministic checks: amount ranges, currency codes, date formats, missing required fields. Doubt sends it back.", accent: false },
  { Icon: UserCheck, label: "Human Gate", desc: "The graph checkpoint waits in Postgres. A person corrects, approves or rejects. Nothing consequential runs without a name on it.", accent: true },
  { Icon: Workflow, label: "Automation Agent", desc: "Resumes from the checkpoint: task routed to the right department, HMAC-signed webhook fired into n8n, response recorded.", accent: false },
];

export function PipelineFlow() {
  return (
    <motion.ol variants={staggerContainer} initial="hidden" whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      className="relative flex flex-col gap-3 lg:gap-0">
      {STAGES.map((s, i) => (
        <motion.li key={s.label} variants={staggerItem} className="relative">
          {i < STAGES.length - 1 && (
            <span aria-hidden
              className="absolute left-[27px] top-14 h-[calc(100%-2.5rem)] w-px overflow-hidden bg-border lg:w-auto lg:h-px lg:left-14 lg:top-[27px] lg:h-px">
              <span className="block h-full w-px bg-gradient-to-b from-primary via-primary/60 to-transparent lg:hidden" />
            </span>
          )}
          <div className={`flex gap-4 rounded-lg border bg-card/70 p-4 backdrop-blur-sm transition-colors lg:items-center
            ${s.accent ? "border-[var(--fault)]/50 shadow-[0_0_40px_-12px_rgba(252,115,77,0.45)]" : "border-border hover:border-primary/40"}`}>
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg border lg:size-14
              ${s.accent ? "border-[var(--fault)]/60 bg-[var(--fault)]/10 text-[var(--fault)]" : "border-primary/40 bg-primary/10 text-primary"}`}>
              <s.Icon className="size-5 lg:size-6" />
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="tnum text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <h3 className={`font-semibold ${s.accent ? "text-[var(--fault)]" : ""}`}>{s.label}</h3>
                {s.accent && (
                  <span className="rounded-full border border-[var(--fault)]/50 px-2 py-0.5 text-[10px] text-[var(--fault)]">
                    approval required
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          </div>
        </motion.li>
      ))}
    </motion.ol>
  );
}
