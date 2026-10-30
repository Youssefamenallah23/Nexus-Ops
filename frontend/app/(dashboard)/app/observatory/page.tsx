"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Activity, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Trace = {
  id: string;
  agent: string;
  provider: string;
  model: string;
  document_id: string | null;
  input_summary: string;
  output: Record<string, unknown>;
  latency_ms: number;
  tokens_in: number | null;
  tokens_out: number | null;
  confidence: number | null;
  status: string;
  created_at: string;
};

type Summary = {
  by_agent: { agent: string; provider: string; calls: number; avg_latency_ms: number }[];
  fallback_rate: number;
  error_rate: number;
  total_calls: number;
};

type EvalResult = {
  provider: string;
  sample: string;
  ok: boolean;
  doc_type?: string;
  confidence?: number;
  latency_ms: number;
  tokens?: Record<string, unknown>;
  error?: string;
};

export default function ObservatoryPage() {
  const { user } = useAuth();
  const [traces, setTraces] = useState<Trace[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [evalResults, setEvalResults] = useState<EvalResult[] | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const load = useCallback(() => {
    api<Trace[]>("/observatory/traces")
      .then(setTraces)
      .catch((e) => {
        toast.error(e.message);
        setTraces([]);
      });
    api<Summary>("/observatory/summary").then(setSummary).catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runEvaluation() {
    setEvaluating(true);
    toast.info("Running parallel evaluation across models...");
    try {
      const r = await api<{ results: EvalResult[] }>("/observatory/evaluate", { method: "POST" });
      setEvalResults(r.results);
      toast.success("Evaluation complete.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  }

  const canEval = user?.role === "administrator";

  return (
    <div className="flex flex-col gap-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
            <span className="text-xs font-medium text-muted-foreground">Model Telemetry & Evaluation</span>
          </div>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">Agent Observatory</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Latency distribution, token consumption, confidence distributions, and fallback telemetry.
          </p>
        </div>

        {canEval && (
          <Button
            onClick={runEvaluation}
            disabled={evaluating}
            className="rounded-full bg-white px-5 text-xs font-semibold text-black shadow-[0_4px_16px_var(--highlight)] hover:bg-white/90 disabled:opacity-50"
          >
            <FlaskConical className="size-3.5" />
            {evaluating ? "Evaluating Providers..." : "Run Multi-Model Benchmark"}
          </Button>
        )}
      </div>

      {/* 3 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {summary ? (
          <>
            <div className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl">
              <div className="text-xs font-medium text-muted-foreground">Total Agent Invocations</div>
              <div className="tnum mt-3 text-3xl font-semibold text-white tracking-tight">
                {summary.total_calls.toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">Logged across all documents</div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl">
              <div className="text-xs font-medium text-muted-foreground">Fallback Rate</div>
              <div className="tnum mt-3 text-3xl font-semibold text-white tracking-tight">
                {Math.round(summary.fallback_rate * 100)}%
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">Heuristic resilience activates on timeout</div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl">
              <div className="text-xs font-medium text-muted-foreground">System Reliability</div>
              <div className="tnum mt-3 text-3xl font-semibold text-[var(--success)] tracking-tight">
                {Math.round((1 - summary.error_rate) * 100)}%
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">Zero unhandled agent exceptions</div>
            </div>
          </>
        ) : (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl bg-white/[0.04]" />
          ))
        )}
      </div>

      {/* Latency by Agent */}
      {summary && (
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl">
          <div className="border-b border-white/[0.06] pb-4">
            <h3 className="text-sm font-semibold text-white">Mean Latency by Agent</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Execution duration measured from dispatch to structured validation.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {summary.by_agent.map((a) => {
              const max = Math.max(...summary.by_agent.map((x) => x.avg_latency_ms), 1);
              return (
                <div key={`${a.agent}-${a.provider}`} className="flex items-center gap-4 text-xs">
                  <span className="w-52 shrink-0 text-white font-medium">
                    {a.agent} <span className="text-[11px] text-muted-foreground">({a.provider})</span>
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max((a.avg_latency_ms / max) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="tnum w-24 text-right font-medium text-white">
                    {a.avg_latency_ms.toLocaleString()} ms
                  </span>
                  <span className="tnum w-14 text-right text-muted-foreground">
                    ×{a.calls}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Provider Benchmark Comparison */}
      {evalResults && (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 backdrop-blur-2xl">
          <div className="border-b border-white/[0.06] p-6">
            <h3 className="text-sm font-semibold text-white">Provider Benchmark Comparison</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Identical documents evaluated simultaneously across configured models.
            </p>
          </div>
          <Table>
            <TableHeader className="border-b border-white/[0.06] bg-white/[0.02]">
              <TableRow className="border-white/[0.06]">
                <TableHead className="text-xs text-muted-foreground font-medium">Provider</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Sample Document</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Classification</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Confidence</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evalResults.map((r, i) => (
                <TableRow key={i} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <TableCell className="text-xs font-medium text-white">{r.provider}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.sample}</TableCell>
                  <TableCell className="text-xs">
                    {r.ok ? (
                      <span className="capitalize text-foreground font-medium">{r.doc_type?.replace(/_/g, " ")}</span>
                    ) : (
                      <span className="text-destructive">{r.error}</span>
                    )}
                  </TableCell>
                  <TableCell className="tnum text-xs">
                    {r.confidence ? `${Math.round(r.confidence * 100)}%` : "—"}
                  </TableCell>
                  <TableCell className="tnum text-xs text-muted-foreground">
                    {(r.latency_ms / 1000).toFixed(1)}s
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Recent Traces Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 backdrop-blur-2xl">
        <div className="border-b border-white/[0.06] p-6">
          <h3 className="text-sm font-semibold text-white">Recent Execution Traces</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable trace records for every agent invocation.
          </p>
        </div>

        {traces === null ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-xl bg-white/[0.03]" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-white/[0.06] bg-white/[0.02]">
              <TableRow className="border-white/[0.06]">
                <TableHead className="text-xs text-muted-foreground font-medium">Agent</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Provider & Model</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Latency</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Tokens (In/Out)</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Confidence</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {traces.map((t) => {
                const isOk = t.status === "ok";
                const isFallback = t.status === "fallback";
                return (
                  <TableRow key={t.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-xs font-medium text-white">{t.agent}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.provider} {t.model && `· ${t.model}`}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                          isOk
                            ? "bg-success/10 text-success border border-success/20"
                            : isFallback
                            ? "bg-fault/10 text-fault border border-fault/20"
                            : "bg-destructive/10 text-destructive border border-destructive/20"
                        }`}
                      >
                        {t.status}
                      </span>
                    </TableCell>
                    <TableCell className="tnum text-xs">{t.latency_ms} ms</TableCell>
                    <TableCell className="tnum text-xs text-muted-foreground">
                      {t.tokens_in ? `${t.tokens_in} / ${t.tokens_out}` : "—"}
                    </TableCell>
                    <TableCell className="tnum text-xs">
                      {t.confidence !== null ? `${Math.round(t.confidence * 100)}%` : "—"}
                    </TableCell>
                    <TableCell className="tnum text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
