"use client";

import { useEffect, useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Analytics } from "@/lib/api";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Analytics | null>(null);
  const [volume, setVolume] = useState<number | null>(null);

  useEffect(() => {
    api<Analytics>("/analytics/overview").then((s) => {
      setStats(s);
      setVolume(s.time_saved_simulator.annual_volume);
    }).catch(() => setStats(null));
  }, []);

  if (!stats || volume === null) {
    return <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;
  }

  const sim = stats.time_saved_simulator;
  const hoursSaved = ((sim.manual_minutes - sim.assisted_minutes) * volume) / 60;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Documents processed" value={String(stats.documents.total)} />
        <Metric label="Pending approvals" value={String(stats.documents.pending_review)} />
        <Metric label="Manual corrections after AI" value={String(stats.automation.manual_corrections)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents by type</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {Object.entries(stats.documents.by_type).sort((a, b) => b[1] - a[1]).map(([type, n]) => (
              <div key={type} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 text-muted-foreground">{type.replace(/_/g, " ")}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary"
                    style={{ width: `${(n / stats.documents.total) * 100}%` }} />
                </div>
                <span className="w-8 text-right tabular-nums">{n}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {Object.entries(stats.tasks.by_status).map(([s, n]) => (
              <div key={s} className="flex justify-between">
                <span className="text-muted-foreground">{s.replace(/_/g, " ")}</span>
                <span className="tabular-nums">{n}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium text-destructive">Overdue</span>
              <span className="tabular-nums">{stats.tasks.overdue}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Time saved simulator</CardTitle>
          <CardDescription>
            {sim.disclaimer} Move the slider to test scenarios. Baseline: employees spend{" "}
            {sim.manual_minutes} min manually processing a document; the assisted workflow takes{" "}
            {sim.assisted_minutes} min of human review.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Annual document volume</span>
              <span className="font-medium tabular-nums">{volume.toLocaleString("fr-FR")} docs/year</span>
            </div>
            <input
              type="range"
              min={100}
              max={10000}
              step={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <div className="rounded-xl border bg-muted/30 p-6 text-center">
            <div className="text-xs text-muted-foreground">Estimated annual hours saved</div>
            <div className="text-4xl font-semibold tabular-nums">
              {hoursSaved.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h
            </div>
            <div className="mt-2 font-mono text-xs text-muted-foreground">
              ({sim.manual_minutes} − {sim.assisted_minutes}) × {volume.toLocaleString("fr-FR")} ÷ 60
            </div>
            <div className="mt-3 text-xs text-destructive">
              Simulated assumption — not a measured company result. Validate with real users
              before quoting internally.
            </div>
          </div>
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
