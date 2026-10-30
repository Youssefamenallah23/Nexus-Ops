"use client";

import { Bot, FileUp, ShieldCheck, Sparkles, UserCheck, Workflow } from "lucide-react";

const STAGES = [
  { Icon: FileUp, title: "Bring in the document", desc: "Supplier quotes, field reports, and maintenance records.", isCheckpoint: false },
  { Icon: Bot, title: "Classify and route", desc: "Identify the document, department, and urgency.", isCheckpoint: false },
  { Icon: Sparkles, title: "Extract the details", desc: "Capture suppliers, amounts, currencies, and deadlines.", isCheckpoint: false },
  { Icon: ShieldCheck, title: "Check the rules", desc: "Validate budgets, dates, and missing information.", isCheckpoint: false },
  { Icon: UserCheck, title: "Make the decision", desc: "Review the proposal. Approve, correct, or reject.", isCheckpoint: true },
  { Icon: Workflow, title: "Put it into motion", desc: "Dispatch signed webhooks, route tasks, and index knowledge.", isCheckpoint: false },
];

export function PipelineFlow() {
  return <ol className="pipeline-stages">{STAGES.map(({ Icon, title, desc, isCheckpoint }, index) => <li key={title} className={isCheckpoint ? "pipeline-step checkpoint-step" : "pipeline-step"}><div className="pipeline-step-top"><Icon aria-hidden="true" /><span>{String(index + 1).padStart(2, "0")}</span></div><h3>{title}</h3><p>{desc}</p>{isCheckpoint && <span className="checkpoint-label">Human approval</span>}</li>)}</ol>;
}
