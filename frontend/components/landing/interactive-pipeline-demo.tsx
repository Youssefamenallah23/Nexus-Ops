"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Sparkles,
  UserCheck,
  SendHorizontal,
  CheckCircle2,
  Play,
  RotateCcw,
  Cpu,
  ShieldCheck,
  Zap,
  X,
} from "lucide-react";
import { MagneticGlowButton } from "./magnetic";

interface SimulationScenario {
  id: string;
  title: string;
  filename: string;
  filesize: string;
  type: string;
  supplier: string;
  amount: string;
  department: string;
  priority: "Standard" | "High" | "Critical";
  qaFlags: string[];
}

const SCENARIOS: SimulationScenario[] = [
  {
    id: "quote-1",
    title: "High-Voltage Transformer Quote",
    filename: "Schneider_Transformer_400kVA.pdf",
    filesize: "1.4 MB",
    type: "Supplier Quote",
    supplier: "Schneider Electric SAS",
    amount: "$42,850.00",
    department: "Grid Infrastructure",
    priority: "High",
    qaFlags: ["Check the supplier and reference against the source", "A manager or administrator makes the decision"],
  },
  {
    id: "report-1",
    title: "Solar Inverter Diagnostic Report",
    filename: "SolarInverter_SectorB_ServiceReport.pdf",
    filesize: "890 KB",
    type: "Intervention Report",
    supplier: "Siemens Energy Services",
    amount: "$4,320.00",
    department: "Renewable Operations",
    priority: "Critical",
    qaFlags: ["Review the reported equipment downtime", "Confirm warranty details against the source"],
  },
  {
    id: "pr-1",
    title: "Battery Cell Purchase Order",
    filename: "PO_BatteryStorage_LithiumPack.pdf",
    filesize: "640 KB",
    type: "Purchase Request",
    supplier: "Saft Industrial Storage",
    amount: "$18,900.00",
    department: "Storage Systems",
    priority: "Standard",
    qaFlags: ["Confirm the procurement request", "Review the proposed delivery date"],
  },
];

export function InteractivePipelineDemo() {
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>(SCENARIOS[0]);
  const [step, setStep] = useState<number>(0);


  useEffect(() => {
    if (![1, 2, 3, 5].includes(step)) return;
    const timer = setTimeout(() => setStep(step === 5 ? 6 : step + 1), step === 5 ? 1500 : 1400);
    return () => clearTimeout(timer);
  }, [step]);

  function startSimulation() {
    setStep(1);
  }

  function resetSimulation() {
    setStep(0);
  }

  function handleHumanApproval() {
    setStep(5);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Top Header & Scenario Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Local workflow simulation
            </span>
          </div>
          <h3 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
            Experience the multi-agent pipeline
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose a sample and try the approval gate. This simulation uploads nothing and sends no webhooks.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {step === 0 || step === 6 || step === 7 ? (
            <MagneticGlowButton
              onClick={startSimulation}
              className="bg-white px-5 py-2.5 text-xs font-semibold text-black shadow-[0_4px_20px_var(--highlight)] hover:bg-white/90"
            >
              <Play className="size-3.5 fill-current" />
              {step >= 6 ? "Replay demo" : "Run demo"}
            </MagneticGlowButton>
          ) : (
            <button
              onClick={resetSimulation}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Scenario Pill Buttons */}
      <div className="flex flex-wrap gap-2.5">
        {SCENARIOS.map((sc) => {
          const isSelected = selectedScenario.id === sc.id;
          return (
            <button
              key={sc.id} aria-pressed={isSelected}
              onClick={() => {
                setSelectedScenario(sc);
                resetSimulation();
              }}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-white text-black shadow-[0_4px_16px_var(--highlight)]"
                  : "border border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              }`}
            >
              {sc.title}
            </button>
          );
        })}
      </div>

      {/* Main Two-Column Stage Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: Pipeline Steps */}
        <div className="flex flex-col gap-2.5 lg:col-span-5">
          <StageCard
            step="1"
            title="Intake & Parsing"
            description="Reads the document text for classification and extraction"
            status={step >= 1 ? (step === 1 ? "active" : "completed") : "pending"}
            Icon={FileText}
          />
          <StageCard
            step="2"
            title="Supervisor Routing"
            description="Evaluates payload complexity & schedules agent workers"
            status={step >= 2 ? (step === 2 ? "active" : "completed") : "pending"}
            Icon={Cpu}
          />
          <StageCard
            step="3"
            title="Structured Extraction"
            description="Mistral / Gemini extracts typed fields with confidence ratings"
            status={step >= 3 ? (step === 3 ? "active" : "completed") : "pending"}
            Icon={Sparkles}
          />
          <StageCard
            step="4"
            title="Deterministic Validation"
            description="Enforces currency formats, amount ceilings, and business rules"
            status={step >= 4 ? (step === 4 ? "active" : "completed") : "pending"}
            Icon={ShieldCheck}
          />
          <StageCard
            step="5"
            title="Human Authorization Gate"
            description="LangGraph halts at Postgres checkpoint awaiting manager sign-off"
            status={step === 7 ? "rejected" : step === 4 ? "checkpoint" : step >= 5 ? "completed" : "pending"}
            Icon={UserCheck}
            isCheckpoint
          />
          <StageCard
            step="6"
            title="Webhook Dispatch & Indexing"
            description="Emits signed HMAC webhook to n8n and generates vector embeddings"
            status={step === 6 ? "completed" : step === 5 ? "active" : "pending"}
            Icon={SendHorizontal}
          />
        </div>

        {/* Right Side: Interactive Live Viewport */}
        <div className="relative flex min-h-[440px] flex-col justify-between rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl lg:col-span-7">
          {/* Subtle Top Status Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-muted-foreground">Workflow preview</span>
            </div>
            <span className="text-muted-foreground/80">
              State: <span className="font-medium text-foreground">{step === 0 ? "Ready" : step === 4 ? "Awaiting sign-off" : step === 6 ? "Dispatched (simulated)" : step === 7 ? "Rejected" : "Processing"}</span>
            </span>
          </div>

          {/* Dynamic Content Display */}
          <div aria-live="polite" aria-atomic="true" className="flex flex-1 flex-col items-center justify-center py-6 text-center">
            {step === 0 && (
              <div className="flex max-w-sm flex-col items-center">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-foreground">
                  <FileText className="size-7" />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-foreground">
                  {selectedScenario.filename}
                </h4>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Ready to process payload ({selectedScenario.filesize}). Click start to trace the document across each autonomous checkpoint.
                </p>
                <MagneticGlowButton
                  onClick={startSimulation}
                  className="mt-6 bg-white px-6 py-2.5 text-xs font-semibold text-black shadow-[0_4px_20px_var(--highlight)] hover:bg-white/90"
                >
                  <Play className="size-3 fill-current" />
                  Run demo
                </MagneticGlowButton>
              </div>
            )}

            {step === 1 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-left">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-xs space-y-2">
                  <div className="text-muted-foreground font-medium">Ingestion Pipeline Active</div>
                  <div className="text-foreground">Document: {selectedScenario.filename}</div>
                  <div className="text-muted-foreground">Sample text prepared locally</div>
                  <div className="flex items-center gap-2 text-primary pt-2">
                    <span className="size-1.5 rounded-full bg-primary animate-ping" />
                    Parsing structured text layout...
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-left">
                <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-xs space-y-2">
                  <div className="text-primary font-medium">Supervisor Execution Plan</div>
                  <div className="text-foreground">Classification, extraction, then quality checks</div>
                  <div className="text-muted-foreground">The server selects the configured model provider.</div>
                  <div className="text-muted-foreground">The local preview uses predefined sample values.</div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-left">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 text-xs space-y-3">
                  <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                    <span className="text-muted-foreground">Classification</span>
                    <span className="font-semibold text-primary">{selectedScenario.type}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                    <span className="text-muted-foreground">Supplier</span>
                    <span className="text-foreground font-medium">{selectedScenario.supplier}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="text-foreground font-semibold">{selectedScenario.amount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Destination Queue</span>
                    <span className="text-foreground">{selectedScenario.department}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
                <div className="flex size-12 items-center justify-center rounded-2xl border border-[var(--fault)]/30 bg-[var(--fault)]/10 text-[var(--fault)]">
                  <UserCheck className="size-6" />
                </div>
                <h4 className="mt-3 text-base font-semibold text-foreground">
                  Human Sign-off Required
                </h4>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Review the sample fields below. In the workspace, LangGraph saves this checkpoint before your approval.
                </p>

                <div className="mt-4 w-full max-w-sm rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vendor:</span>
                    <span className="text-foreground font-medium">{selectedScenario.supplier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="text-[var(--fault)] font-semibold">{selectedScenario.amount}</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3"><button type="button" onClick={() => setStep(7)} className="rounded-full border border-border px-5 py-2 text-sm text-foreground">Reject sample</button>
                  <MagneticGlowButton
                    onClick={handleHumanApproval}
                    className="bg-[var(--fault)] px-6 py-2.5 text-xs font-semibold text-black shadow-[0_4px_20px_var(--amber-wash)] hover:bg-[var(--fault)]/90"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Approve & Resume Execution
                  </MagneticGlowButton>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md text-left space-y-3">
                <div className="flex items-center gap-2 text-primary text-xs">
                  <Zap className="size-4 animate-pulse" />
                  <span>Resuming LangGraph from saved checkpoint...</span>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-xs space-y-2">
                  <div className="text-muted-foreground font-medium">Example dispatch payload</div>
                  <div className="break-all text-xs text-foreground">{selectedScenario.filename} to {selectedScenario.department}</div>
                  <div className="text-muted-foreground">No webhook is sent from this preview.</div>
                </div>
              </motion.div>
            )}

            {step === 7 && <div className="flex flex-col items-center gap-4"><X className="size-8 text-destructive" /><h4>Sample rejected</h4><p className="max-w-xs text-sm text-muted-foreground">The workflow stops here. No dispatch step runs after rejection.</p><button type="button" onClick={resetSimulation} className="text-sm text-primary underline">Choose another sample</button></div>}
            {step === 6 && (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30">
                  <CheckCircle2 className="size-7" />
                </div>
                <h4 className="mt-4 text-base font-semibold text-foreground">
                  Workflow completed in simulation
                </h4>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  The real workflow creates a task for {selectedScenario.department}, records delivery, and indexes approved knowledge.
                </p>
                <button
                  onClick={startSimulation}
                  className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
                >
                  <RotateCcw className="size-3" />
                  Run another test
                </button>
              </motion.div>
            )}
          </div>

          {/* Bottom Footer Telemetry */}
          <div className="border-t border-white/[0.06] pt-3 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Preview runs in this browser</span>
            <span>Use the workspace for real processing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageCard({
  step,
  title,
  description,
  status,
  Icon,

}: {
  step: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed" | "checkpoint" | "rejected";
  Icon: React.ElementType;
  isCheckpoint?: boolean;
}) {
  const isCompleted = status === "completed";
  const isActive = status === "active";
  

  let borderStyle = "border-white/[0.06] bg-white/[0.02] text-muted-foreground";
  let iconStyle = "bg-white/[0.05] text-muted-foreground";

  if (isCompleted) {
    borderStyle = "border-white/[0.12] bg-white/[0.04] text-foreground opacity-100";
    iconStyle = "bg-primary/10 text-primary";
  } else if (isActive) {
    borderStyle = "border-primary/40 bg-primary/[0.05] text-foreground opacity-100";
    iconStyle = "bg-primary text-black font-semibold";
  } else if (status === "rejected") { borderStyle = "border-destructive/40 bg-destructive/10 text-foreground"; iconStyle = "text-destructive";
  } else if (status === "checkpoint") {
    borderStyle = "border-[var(--fault)]/50 bg-[var(--fault)]/[0.08] text-foreground opacity-100";
    iconStyle = "bg-[var(--fault)] text-black font-semibold";
  }

  return (
    <div className={`flex items-center gap-3.5 rounded-xl border p-3.5 transition-colors duration-300 ${borderStyle}`}>
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs ${iconStyle}`}>
        {isCompleted ? <CheckCircle2 className="size-4" /> : status === "rejected" ? <X className="size-4" /> : <Icon className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground">{title}</span>
          <span className="text-[10px] text-muted-foreground">Stage {step}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}


