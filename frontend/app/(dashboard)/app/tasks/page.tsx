"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckSquare, Clock, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, type TaskRow } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const STATUSES = ["pending_review", "approved", "in_progress", "blocked", "completed"];

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);

  useEffect(() => {
    api<TaskRow[]>("/tasks")
      .then(setTasks)
      .catch((e) => {
        toast.error(e.message);
        setTasks([]);
      });
  }, []);

  async function setStatus(task: TaskRow, status: string) {
    try {
      await api(`/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setTasks((prev) => prev!.map((t) => (t.id === task.id ? { ...t, status } : t)));
      toast.success("Task status updated and audited.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const overdue = (t: TaskRow) =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Department Tasks</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Work items created automatically upon document approval and routed to owning divisions.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 backdrop-blur-2xl">
        {tasks === null ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl bg-white/[0.03]" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            No active tasks found in the queue.
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-white/[0.06] bg-white/[0.02]">
              <TableRow className="border-white/[0.06]">
                <TableHead className="text-xs text-muted-foreground font-medium">Task Title</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Department</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Assignee</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Due Date</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Current State</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <TableCell className="max-w-md truncate text-xs font-medium text-white">
                    {t.title}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.department}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.assignee_name ?? "Unassigned"}</TableCell>
                  <TableCell className="text-xs">
                    {t.due_date ? (
                      <span className={overdue(t) ? "text-[var(--fault)] font-medium" : "text-muted-foreground"}>
                        {new Date(t.due_date).toLocaleDateString()}
                        {overdue(t) && " (Overdue)"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Select value={t.status} onValueChange={(v: string | null) => v && setStatus(t, v)}>
                      <SelectTrigger size="sm" className="w-36 rounded-full border-white/[0.1] bg-white/[0.04] text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-white/[0.1] bg-[var(--card)]">
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs capitalize">
                            {s.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
