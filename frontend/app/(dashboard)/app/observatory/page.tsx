"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Trace = {
  id: string; agent: string; provider: string; model: string; document_id: string | null;
  input_summary: string; output: Record<string, unknown>; latency_ms: number;
  tokens_in: number | null; tokens_out: number | null; confidence: number | null;
  status: string; created_at: string;
};

type Summary = {
  by_agent: { agent: string; provider: string; calls: number; avg_latency_ms: number }[];
  fallback_rate: number; error_rate: number; total_calls: number;
};

type EvalResult = {
  provider: string; sample: string; ok: boolean; doc_type?: string;
  confidence?: number; latency_ms: number; tokens?: Record<string, unknown>; error?: string;
};

const STATUS_STYLE: Record<string, string> = {
  ok: "border-primary/40 bg-primary/10 text-primary",
  fallback: "border-[var(--fault)]/40 bg-[var(--fault)]/10 text-[var(--fault)]",
  error: "border-[var(--fault)] bg-[var(--fault)] text-[#02070a]",
};

export default function ObservatoryPage() {
  const { user } = useAuth();
  const [traces, setTraces] = useState<Trace[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [evalResults, setEvalResults] = useState<EvalResult[] | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const load = useCallback(() => {
    api<Trace[]>("/observatory/traces").then(setTraces).catch((e) => { toast.error(e.message); setTraces([]); });
    api<Summary>("/observatory/summary").then(setSummary).catch(() => setSummary(null));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runEvaluation() {
    setEvaluating(true);
    toast.info("Running providers on identical documents — Mistral may take a couple of minutes...");
    try {
      const r = await api<{ results: EvalResult[] }>("/observatory/evaluate", { method: "POST" });
      setEvalResults(r.results);
      toast.success("Evaluation complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  }

  const canEval = user?.role === "administrator";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Agent Observatory</h2>
          <p className="text-sm text-muted-foreground">
            Which agent ran, on which model, how long it took, how confident it was.
          </p>
        </div>
        {canEval && (
          <Button onClick={runEvaluation} disabled={evaluating}>
            <FlaskConical /> {evaluating ? "Running..." : "Run provider evaluation"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {summary ? (
          <>
            <Metric label="Total agent calls" value={String(summary.total_calls)} />
            <Metric label="Fallback rate" value={`${Math.round(summary.fallback_rate * 100)}%`} />
            <Metric label="Error rate" value={`${Math.round(summary.error_rate * 100)}%`} />
          </>
        ) : (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        )}
      </div>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average latency per agent</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {summary.by_agent.map((a) => {
              const max = Math.max(...summary.by_agent.map((x) => x.avg_latency_ms), 1);
              return (
                <div key={`${a.agent}-${a.provider}`} className="flex items-center gap-3 text-sm">
                  <span className="w-56 shrink-0 text-muted-foreground">
                    {a.agent} <span className="tnum text-xs opacity-60">({a.provider})</span>
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(a.avg_latency_ms / max) * 100}%` }} />
                  </div>
                  <span className="tnum w-20 text-right">{a.avg_latency_ms.toLocaleString("fr-FR")} ms</span>
                  <span className="tnum w-12 text-right text-muted-foreground">×{a.calls}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}


      {evalResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider evaluation — identical documents</CardTitle>
            <CardDescription>
              Same inputs, all configured providers. Agreement and latency are the experiment; the
              mock provider is the deterministic baseline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Sample</TableHead>
                  <TableHead>Classified as</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evalResults.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="tnum">{r.provider}</TableCell>
                    <TableCell>{r.sample}</TableCell>
                    <TableCell>
                      {r.ok ? r.doc_type : <span className="text-[var(--fault)]">{r.error}</span>}
                    </TableCell>
                    <TableCell className="tnum">
                      {r.confidence !== undefined && r.confidence !== null ? `${Math.round(r.confidence * 100)}%` : "—"}
                    </TableCell>
                    <TableCell className="tnum">{(r.latency_ms / 1000).toFixed(1)}s</TableCell>
                    <TableCell className="tnum text-muted-foreground">
                      {r.tokens && r.tokens.in ? `${r.tokens.in}/${r.tokens.out}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent agent traces</CardTitle>
        </CardHeader>
        <CardContent>
          {traces === null ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Provider / model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {traces.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.agent}</TableCell>
                    <TableCell className="tnum text-xs text-muted-foreground">
                      {t.provider}{t.model && ` · ${t.model}`}
                    </TableCell>
                    <TableCell>
                      <span className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_STYLE[t.status] ?? "border-border text-muted-foreground"}`}>
                        {t.status}
                      </span>
                    </TableCell>
                    <TableCell className="tnum">{t.latency_ms} ms</TableCell>
                    <TableCell className="tnum text-muted-foreground">
                      {t.tokens_in ? `${t.tokens_in}/${t.tokens_out}` : "—"}
                    </TableCell>
                    <TableCell className="tnum">
                      {t.confidence !== null ? `${Math.round(t.confidence * 100)}%` : "—"}
                    </TableCell>
                    <TableCell className="tnum text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleTimeString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  );
}

