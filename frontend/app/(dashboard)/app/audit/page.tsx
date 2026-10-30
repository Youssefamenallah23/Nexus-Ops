"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, type AuditRow } from "@/lib/api";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    api<AuditRow[]>("/audit-events")
      .then(setEvents)
      .catch((e) => {
        toast.error(e.message);
        setEvents([]);
      });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Security & Audit Ledger</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Immutable, append-only log of human approvals, AI revisions, and cryptographic webhook dispatches.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 backdrop-blur-2xl">
        {events === null ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-xl bg-white/[0.03]" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            No audit records captured yet.
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-white/[0.06] bg-white/[0.02]">
              <TableRow className="border-white/[0.06]">
                <TableHead className="text-xs text-muted-foreground font-medium">Timestamp</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Actor / Origin</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Operation</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Entity Type</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Event Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <TableCell className="tnum text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-white">{e.actor_label}</TableCell>
                  <TableCell>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] text-primary">
                      {e.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.entity_type} {e.entity_id && `· ${e.entity_id.slice(0, 8)}`}
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-[11px] text-muted-foreground">
                    {JSON.stringify(e.detail)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
