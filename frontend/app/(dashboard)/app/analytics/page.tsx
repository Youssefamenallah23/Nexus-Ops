"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Analytics } from "@/lib/api";
import { TiltCard } from "@/components/landing/tilt-card";
import { Gauge, CheckCircle2, AlertCircle, BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Analytics | null>(null);
  const [volume, setVolume] = useState<number | null>(null);

  useEffect(() => {
    api<Analytics>("/analytics/overview")
      .then((s) => {
        setStats(s);
        setVolume(s.time_saved_simulator.annual_volume);
      })
      .catch(() => setStats(null));
  }, []);

  if (!stats || volume === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  const sim = stats.time_saved_simulator;
  const hoursSaved = ((sim.manual_minutes - sim.assisted_minutes) * volume) / 60;

  return (
    <div className="flex flex-col gap-8">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Operations Analytics</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Empirical volume metrics, straight-through automation rates, and interactive time-saved modeling.
        </p>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl">
          <span className="text-xs font-medium text-muted-foreground">Total Ingested Volume</span>
          <div className="tnum mt-3 text-3xl font-semibold text-white tracking-tight">
            {stats.documents.total.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">Across all operations categories</div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl">
          <span className="text-xs font-medium text-muted-foreground">Pending Approvals</span>
          <div className={`tnum mt-3 text-3xl font-semibold tracking-tight ${stats.documents.pending_review > 0 ? "text-[var(--fault)]" : "text-white"}`}>
            {stats.documents.pending_review.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">Currently awaiting human review</div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl">
          <span className="text-xs font-medium text-muted-foreground">Human Revisions</span>
          <div className="tnum mt-3 text-3xl font-semibold text-white tracking-tight">
            {stats.automation.manual_corrections.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">Corrections recorded & audited</div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Document Type */}
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl">
          <div className="border-b border-white/[0.06] pb-4">
            <h3 className="text-sm font-semibold text-white">Volume by Document Category</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Distribution across verified categories.</p>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {Object.entries(stats.documents.by_type)
              .sort((a, b) => b[1] - a[1])
              .map(([type, n]) => (
                <div key={type} className="flex items-center gap-4 text-xs">
                  <span className="w-48 shrink-0 text-white font-medium capitalize">
                    {type.replace(/_/g, " ")}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.max((n / stats.documents.total) * 100, 4)}%`,
                      }}
                    />
                  </div>
                  <span className="tnum w-12 text-right font-medium text-white">{n}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Tasks by Status */}
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl">
          <div className="border-b border-white/[0.06] pb-4">
            <h3 className="text-sm font-semibold text-white">Task Queue Distribution</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Execution statuses across departments.</p>
          </div>

          <div className="mt-5 flex flex-col gap-3 text-xs">
            {Object.entries(stats.tasks.by_status).map(([s, n]) => (
              <div key={s} className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                <span className="text-muted-foreground capitalize">{s.replace(/_/g, " ")}</span>
                <span className="tnum font-medium text-white">{n}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <span className="font-medium text-[var(--fault)]">Overdue Actions</span>
              <span className="tnum font-semibold text-[var(--fault)]">{stats.tasks.overdue}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Simulator */}
      <div className="rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-6 backdrop-blur-2xl">
        <div className="border-b border-white/[0.06] pb-4">
          <h3 className="text-sm font-semibold text-white">Interactive Time-Saved Simulator</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adjust the annual volume slider to project labor savings based on baseline assumptions.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Simulated Annual Document Volume</span>
              <span className="tnum font-semibold text-white">{volume.toLocaleString()} docs / year</span>
            </div>
            <input
              type="range"
              min={100}
              max={10000}
              step={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.1] accent-primary"
            />
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
            <span className="text-xs text-muted-foreground">Projected Annual Engineering Hours Saved</span>
            <div className="tnum mt-2 text-5xl font-semibold tracking-tight text-white">
              {Math.round(hoursSaved).toLocaleString()} hours
            </div>
            <div className="mt-3 font-mono text-xs text-muted-foreground">
              Formula: ({sim.manual_minutes}m manual − {sim.assisted_minutes}m assisted) × {volume.toLocaleString()} ÷ 60
            </div>
            <div className="mt-4 text-[11px] text-muted-foreground/80">
              {sim.disclaimer}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
