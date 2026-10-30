"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { api, type AuditRow } from "@/lib/api";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    api<AuditRow[]>("/audit-events").then(setEvents).catch((e) => { toast.error(e.message); setEvents([]); });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audit logs</CardTitle>
        <CardDescription>
          Every document access, AI suggestion, human decision and automation event — append-only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events === null ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell className="font-medium">{e.actor_label}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{e.action}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.entity_type}
                    {e.entity_id && ` · ${e.entity_id.slice(0, 8)}`}
                  </TableCell>
                  <TableCell className="max-w-64 truncate font-mono text-xs text-muted-foreground">
                    {JSON.stringify(e.detail)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
