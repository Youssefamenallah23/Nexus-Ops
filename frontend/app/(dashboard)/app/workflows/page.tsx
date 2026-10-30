"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Execution = {
  id: string; workflow_type: string; entity_type: string; entity_id: string | null;
  status: string; attempt: number; payload: Record<string, unknown>;
  response: Record<string, unknown> | null; error: string | null; created_at: string;
};

type Config = { n8n_configured: boolean; webhook_url: string | null; mock_mode: boolean };

const WF_LABELS: Record<string, string> = {
  document_approved: "Document approved",
  task_reminder: "Task reminder",
};

export default function WorkflowsPage() {
  const { user } = useAuth();
  const [execs, setExecs] = useState<Execution[] | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    api<Execution[]>("/workflows/executions").then(setExecs).catch((e) => { toast.error(e.message); setExecs([]); });
  }, []);

  useEffect(() => {
    load();
    api<Config>("/workflows/config").then(setConfig).catch(() => setConfig(null));
  }, [load]);

  const canAct = user?.role === "administrator" || user?.role === "manager";

  async function retry(id: string) {
    try {
      const r = await api<{ new_status: string }>(`/workflows/executions/${id}/retry`, { method: "POST" });
      toast.success(`Retry finished: ${r.new_status}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
    }
  }

  async function sendReminders() {
    setSending(true);
    try {
      const r = await api<{ sent: number; failed: number; mock: number }>("/workflows/reminders", { method: "POST" });
      toast.success(`Reminders: ${r.sent} sent, ${r.mock} mock, ${r.failed} failed`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reminders");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Workflow automation</h2>
          <p className="text-sm text-muted-foreground">
            Every emission to n8n, recorded with its payload, response and outcome.
          </p>
        </div>
        {canAct && (
          <Button onClick={sendReminders} disabled={sending}>
            <BellRing /> {sending ? "Sending..." : "Send overdue reminders"}
          </Button>
        )}
      </div>

      {config && (
        <Card>
          <CardContent className="flex items-center gap-3 py-3 text-sm">
            <span className={`size-2 rounded-full ${config.n8n_configured ? "bg-[var(--voltage)]" : "bg-[var(--fault)]"}`} />
            {config.n8n_configured ? (
              <>Connected to n8n at <code className="tnum rounded bg-muted px-1.5 py-0.5">{config.webhook_url}</code></>
            ) : (
              <span className="text-muted-foreground">
                Mock mode — no n8n webhook configured. Set <code className="tnum">N8N_WEBHOOK_URL</code> in
                .env and restart the backend to go live.
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          {execs === null ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : execs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No workflow executions yet — approve a document to trigger one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Payload / error</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {execs.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{WF_LABELS[e.workflow_type] ?? e.workflow_type}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                    <TableCell className="tnum whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("fr-FR")}
                      {e.attempt > 1 && ` · try ${e.attempt}`}
                    </TableCell>
                    <TableCell className="max-w-80">
                      {e.error ? (
                        <span className="line-clamp-2 text-xs text-[var(--fault)]">{e.error}</span>
                      ) : (
                        <code className="tnum line-clamp-2 text-xs text-muted-foreground">
                          {JSON.stringify(e.payload)}
                        </code>
                      )}
                    </TableCell>
                    <TableCell>
                      {canAct && e.status !== "success" && (
                        <Button variant="outline" size="xs" onClick={() => retry(e.id)}>
                          <RefreshCw /> Retry
                        </Button>
                      )}
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

