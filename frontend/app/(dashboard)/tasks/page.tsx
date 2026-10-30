"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { api, type TaskRow } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const STATUSES = ["pending_review", "approved", "in_progress", "blocked", "completed"];

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);

  useEffect(() => {
    api<TaskRow[]>("/tasks").then(setTasks).catch((e) => { toast.error(e.message); setTasks([]); });
  }, []);

  async function setStatus(task: TaskRow, status: string) {
    try {
      await api(`/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setTasks((prev) => prev!.map((t) => (t.id === task.id ? { ...t, status } : t)));
      toast.success("Task updated — logged in the audit trail.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const overdue = (t: TaskRow) =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tasks</CardTitle>
        <CardDescription>
          Created automatically when approved documents are routed to a department.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tasks === null ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="max-w-72 truncate font-medium">{t.title}</TableCell>
                  <TableCell className="text-muted-foreground">{t.department}</TableCell>
                  <TableCell className="text-muted-foreground">{t.assignee_name ?? "—"}</TableCell>
                  <TableCell className={overdue(t) ? "text-destructive" : "text-muted-foreground"}>
                    {t.due_date ? new Date(t.due_date).toLocaleDateString("fr-FR") : "—"}
                    {overdue(t) && " (overdue)"}
                  </TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                  <TableCell>
                    <Select value={t.status} onValueChange={(v: string | null) => v && setStatus(t, v)}>
                      <SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
