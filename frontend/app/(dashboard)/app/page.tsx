"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { TiltCard } from "@/components/landing/tilt-card";
import { api, type Analytics, type DocumentRow } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Sparkles, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

const DOC_TYPE_LABELS: Record<string, string> = {
  supplier_quote: "Supplier Quote",
  purchase_request: "Purchase Request",
  intervention_report: "Intervention Report",
  maintenance_report: "Maintenance Report",
  meeting_minutes: "Meeting Minutes",
  other: "Document",
};

export default function OverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Analytics | null>(null);
  const [docs, setDocs] = useState<DocumentRow[] | null>(null);

  useEffect(() => {
    api<Analytics>("/analytics/overview").then(setStats).catch(() => setStats(null));
    api<DocumentRow[]>("/documents").then(setDocs).catch(() => setDocs([]));
  }, []);

  const pending = stats?.documents.pending_review ?? 0;
  const overdue = stats?.tasks.overdue ?? 0;
  const saved = stats?.time_saved_simulator.estimated_hours_saved ?? 0;
  const sim = stats?.time_saved_simulator;

  return (
    <div className="flex flex-col gap-8">
      {/* Top Welcome Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Your operations, {user?.name.split(" ")[0]}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Overview of autonomous operations and items requiring authorization.
          </p>
        </div>

        <div className="mt-4 sm:mt-0">
          <Link
            href="/app/documents"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black shadow-[0_4px_16px_var(--highlight)] transition-colors hover:bg-white/90 hover:scale-[1.02]"
          >
            Upload Document
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Apple-Style Frosted Metric Cards */}
      <div className="overview-metrics grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats ? (
          <>
            <TiltCard
              maxTilt={5}
              glowColor={pending > 0 ? "var(--amber-wash)" : "var(--highlight)"}
              className={`p-6 ${
                pending > 0 ? "border-[var(--fault)]/40 bg-[var(--checkpoint-surface)]/80" : ""
              }`}
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Pending Review</span>
                <AlertCircle className={`size-4 ${pending > 0 ? "text-[var(--fault)]" : "text-muted-foreground"}`} />
              </div>
              <div className={`tnum mt-3 text-4xl font-semibold tracking-tight ${pending > 0 ? "text-[var(--fault)]" : "text-white"}`}>
                {pending}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">{stats.documents.total} documents tracked</div>
            </TiltCard>

            <TiltCard maxTilt={5} className="p-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Overdue Tasks</span>
                <Clock className="size-4 text-muted-foreground" />
              </div>
              <div className={`tnum mt-3 text-4xl font-semibold tracking-tight ${overdue > 0 ? "text-[var(--fault)]" : "text-white"}`}>
                {overdue}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {stats.tasks.by_status.completed ?? 0} successfully routed
              </div>
            </TiltCard>

            <TiltCard maxTilt={5} className="p-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Review completion</span>
                <Sparkles className="size-4 text-primary" />
              </div>
              <div className="tnum mt-3 text-4xl font-semibold tracking-tight text-white">
                {Math.round(stats.documents.straight_through_rate * 100)}%
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">Approved or rejected documents</div>
            </TiltCard>

            <TiltCard maxTilt={5} className="p-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Hours Saved</span>
                <CheckCircle2 className="size-4 text-[var(--success)]" />
              </div>
              <div className="tnum mt-3 text-4xl font-semibold tracking-tight text-white">
                {saved.toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">Annual baseline model</div>
            </TiltCard>
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl bg-white/[0.04]" />
          ))
        )}
      </div>

      {/* Main Grid: Recent Documents & Simulator */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Documents Card */}
        <TiltCard maxTilt={3} className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Documents</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ingested operations files and validation status.
              </p>
            </div>
            <Link
              href="/app/documents"
              className="shrink-0 whitespace-nowrap text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {(docs ?? []).slice(0, 6).map((d) => (
              <Link
                key={d.id}
                href={`/app/documents/${d.id}`}
                className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-xs transition-colors hover:bg-white/[0.05] hover:border-white/[0.12]"
              >
                <div className="min-w-0 pr-4">
                  <div className="truncate font-medium text-white group-hover:text-primary transition-colors">
                    {d.filename}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {DOC_TYPE_LABELS[d.doc_type] ?? d.doc_type} · {d.uploader_name}
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </Link>
            ))}

            {docs && docs.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No documents uploaded yet.
              </p>
            )}
          </div>
        </TiltCard>

        {/* Time Saved Card */}
        <TiltCard maxTilt={4} className="p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-white/[0.06] pb-4">
              <h3 className="text-sm font-semibold text-white">Time Saved Simulator</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{sim?.disclaimer}</p>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between rounded-lg bg-white/[0.03] p-2.5">
                <span className="text-muted-foreground">Manual Processing:</span>
                <span className="text-white font-medium">{sim?.manual_minutes ?? "–"} min / doc</span>
              </div>
              <div className="flex justify-between rounded-lg bg-white/[0.03] p-2.5">
                <span className="text-muted-foreground">Agent Assisted:</span>
                <span className="text-primary font-medium">{sim?.assisted_minutes ?? "–"} min / doc</span>
              </div>
              <div className="flex justify-between rounded-lg bg-white/[0.03] p-2.5">
                <span className="text-muted-foreground">Annual Volume:</span>
                <span className="text-white font-medium">{sim?.annual_volume ?? "–"} docs / year</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-muted-foreground">
              <span className="text-white font-medium">Formula:</span>
              <code className="mt-1 block font-mono text-[10px] text-muted-foreground break-all">{sim?.formula}</code>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/app/analytics"
              data-slot="button"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "w-full rounded-full border-white/[0.1] bg-white/[0.04] text-xs text-white hover:bg-white/[0.08]",
              })}
            >
              Open Detailed Simulator
            </Link>
          </div>
        </TiltCard>
      </div>
    </div>
  );
}
