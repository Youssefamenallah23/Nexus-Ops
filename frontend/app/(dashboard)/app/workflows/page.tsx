"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, RefreshCw, Workflow, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
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

type Execution = {
  id: string;
  workflow_type: string;
  entity_type: string;
  entity_id: string | null;
  status: string;
  attempt: number;
  payload: Record<string, unknown>;
  response: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
};

type Config = { n8n_configured: boolean; webhook_url: string | null; mock_mode: boolean };

const WF_LABELS: Record<string, string> = {
  document_approved: "Document Approved & Dispatched",
  task_reminder: "Overdue Task Notification",
};

export default function WorkflowsPage() {
  const { user } = useAuth();
  const [execs, setExecs] = useState<Execution[] | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    api<Execution[]>("/workflows/executions")
      .then(setExecs)
      .catch((e) => {
        toast.error(e.message);
        setExecs([]);
      });
  }, []);

  useEffect(() => {
    load();
    api<Config>("/workflows/config").then(setConfig).catch(() => setConfig(null));
  }, [load]);

  const canAct = user?.role === "administrator" || user?.role === "manager";

  async function retry(id: string) {
    try {
      const r = await api<{ new_status: string }>(`/workflows/executions/${id}/retry`, {
        method: "POST",
      });
      toast.success(`Retry complete: status ${r.new_status}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
    }
  }

  async function sendReminders() {
    setSending(true);
    try {
      const r = await api<{ sent: number; failed: number; mock: number }>("/workflows/reminders", {
        method: "POST",
      });
      toast.success(`Reminders: ${r.sent} sent, ${r.mock} simulated, ${r.failed} failed`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to emit reminders");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Workflows & Integrations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cryptographically signed webhook emissions dispatched to external n8n automation clusters.
          </p>
        </div>

        {canAct && (
          <Button
            onClick={sendReminders}
            disabled={sending}
            className="rounded-full bg-white px-5 text-xs font-semibold text-black shadow-[0_4px_16px_var(--highlight)] hover:bg-white/90 disabled:opacity-50"
          >
            <BellRing className="size-3.5" />
            {sending ? "Emitting..." : "Trigger Overdue Reminders"}
          </Button>
        )}
      </div>

      {/* Cluster Status Banner */}
      {config && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 p-4 text-xs backdrop-blur-2xl">
          <span
            className={`size-2 rounded-full ${
              config.n8n_configured
                ? "bg-[var(--success)] shadow-[0_0_8px_var(--highlight)]"
                : "bg-fault shadow-[0_0_8px_var(--amber-wash)]"
            }`}
          />
          {config.n8n_configured ? (
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">Connected to n8n webhook cluster:</span>
              <code className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-primary">
                {config.webhook_url}
              </code>
            </div>
          ) : (
            <span className="text-muted-foreground">
              Mock orchestration active. Set <code className="font-mono text-white">N8N_WEBHOOK_URL</code> in environment variables for live remote webhook dispatch.
            </span>
          )}
        </div>
      )}

      {/* Executions Table Card */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 backdrop-blur-2xl">
        <div className="border-b border-white/[0.06] p-6">
          <h3 className="text-sm font-semibold text-white">Workflow Execution History</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete audit of every automated trigger, HMAC payload, and receipt acknowledgment.
          </p>
        </div>

        {execs === null ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl bg-white/[0.03]" />
            ))}
          </div>
        ) : execs.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            No workflow executions recorded yet. Approve a document to trigger the Automation Agent.
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-white/[0.06] bg-white/[0.02]">
              <TableRow className="border-white/[0.06]">
                <TableHead className="text-xs text-muted-foreground font-medium">Event Type</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Delivery Status</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Timestamp</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Payload Data</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {execs.map((e) => (
                <TableRow key={e.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <TableCell className="text-xs font-medium text-white">
                    {WF_LABELS[e.workflow_type] ?? e.workflow_type}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={e.status} />
                  </TableCell>
                  <TableCell className="tnum text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString()}
                    {e.attempt > 1 && ` · Try ${e.attempt}`}
                  </TableCell>
                  <TableCell className="max-w-md">
                    {e.error ? (
                      <span className="text-xs text-destructive font-medium">{e.error}</span>
                    ) : (
                      <code className="block truncate font-mono text-[11px] text-muted-foreground">
                        {JSON.stringify(e.payload)}
                      </code>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canAct && e.status !== "success" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retry(e.id)}
                        className="rounded-full border-white/[0.1] text-xs hover:bg-white/[0.08]"
                      >
                        <RefreshCw className="size-3" /> Retry
                      </Button>
                    )}
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
