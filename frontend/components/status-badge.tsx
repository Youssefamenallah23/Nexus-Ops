import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  uploaded: { label: "Uploaded", variant: "outline" },
  needs_review: { label: "Needs review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  pending_review: { label: "Pending", variant: "outline" },
  in_progress: { label: "In progress", variant: "secondary" },
  blocked: { label: "Blocked", variant: "destructive" },
  completed: { label: "Completed", variant: "default" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
