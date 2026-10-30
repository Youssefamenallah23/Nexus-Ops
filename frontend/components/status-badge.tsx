import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; className: string }> = {
  uploaded: { label: "Uploaded", className: "border-border text-muted-foreground" },
  needs_review: { label: "Needs review", className: "border-[var(--fault)]/40 bg-[var(--fault)]/10 text-[var(--fault)]" },
  approved: { label: "Approved", className: "border-primary/40 bg-primary/10 text-primary" },
  rejected: { label: "Rejected", className: "border-transparent bg-[var(--fault)] text-[#02070a]" },
  pending_review: { label: "Pending", className: "border-border text-muted-foreground" },
  in_progress: { label: "In progress", className: "border-primary/30 bg-primary/5 text-primary/90" },
  blocked: { label: "Blocked", className: "border-[var(--fault)]/40 bg-[var(--fault)]/10 text-[var(--fault)]" },
  completed: { label: "Completed", className: "border-transparent bg-primary text-[#02070a]" },
  success: { label: "Success", className: "border-primary/40 bg-primary/10 text-primary" },
  mock: { label: "Mock", className: "border-border text-muted-foreground" },
  failed: { label: "Failed", className: "border-[var(--fault)]/40 bg-[var(--fault)]/10 text-[var(--fault)]" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, className: "border-border text-muted-foreground" };
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

