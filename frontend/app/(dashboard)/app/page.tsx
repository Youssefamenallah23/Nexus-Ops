"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { api, type Analytics, type DocumentRow } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const DOC_TYPE_LABELS: Record<string, string> = {
  supplier_quote: "Supplier quote",
  purchase_request: "Purchase request",
  intervention_report: "Intervention report",
  maintenance_report: "Maintenance report",
  meeting_minutes: "Meeting minutes",
  other: "Other",
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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Hello, {user?.name.split(" ")[0]}
        </h2>
        <p className="text-sm text-muted-foreground">Here is what needs your attention today.</p>
      </div>

      <div className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
        {stats ? (
          <>
            <StatCell label="Pending review" value={pending} tone={pending > 0 ? "fault" : "quiet"}
              hint={`${stats.documents.total} documents total`} />
            <StatCell label="Overdue tasks" value={overdue} tone={overdue > 0 ? "fault" : "quiet"}
              hint={`${stats.tasks.by_status.completed ?? 0} completed`} />
            <StatCell label="Automation rate"
              value={`${Math.round(stats.documents.straight_through_rate * 100)}%`} tone="voltage"
              hint="processed with human review" />
            <StatCell label="Hours saved / year" value={saved.toLocaleString("fr-FR")} tone="voltage"
              hint="simulated — see analytics" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Latest documents</CardTitle>
            <CardDescription>Most recent uploads and their review status.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(docs ?? []).slice(0, 6).map((d) => (
              <Link key={d.id} href={`/documents/${d.id}`}
                className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {DOC_TYPE_LABELS[d.doc_type] ?? d.doc_type} · {d.uploader_name}
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </Link>
            ))}
            {docs && docs.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No documents yet — upload your first one.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" render={<Link href="/documents" />}>
              View all documents
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time saved simulator</CardTitle>
            <CardDescription>{sim?.disclaimer}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="flex flex-col gap-1 font-mono text-xs text-foreground">
              <span>manual: {sim?.manual_minutes ?? "–"} min/doc</span>
              <span>assisted: {sim?.assisted_minutes ?? "–"} min/doc</span>
              <span>volume: {sim?.annual_volume ?? "–"} docs/year</span>
            </div>
            <p className="mt-3">
              Formula: <code className="rounded bg-muted px-1">{sim?.formula}</code>
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" render={<Link href="/analytics" />}>
              Open simulator
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function StatCell({ label, value, hint, tone }: {
  label: string; value: string | number; hint: string; tone: "fault" | "voltage" | "quiet";
}) {
  const toneClass =
    tone === "fault" ? "text-[var(--fault)]" : tone === "voltage" ? "text-[var(--voltage)]" : "text-foreground";
  return (
    <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`tnum text-3xl font-medium leading-none ${toneClass}`}>{value}</span>
      <span className="text-xs text-muted-foreground/70">{hint}</span>
    </div>
  );
}


