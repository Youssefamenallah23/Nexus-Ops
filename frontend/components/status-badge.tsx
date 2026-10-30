import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; className: string }> = {
  uploaded: {
    label: "Uploaded",
    className: "border-white/[0.08] bg-white/[0.04] text-muted-foreground rounded-full",
  },
  needs_review: {
    label: "Needs Review",
    className: "border-fault/30 bg-fault/10 text-fault font-medium rounded-full",
  },
  approved: {
    label: "Approved",
    className: "border-success/30 bg-success/10 text-success font-medium rounded-full",
  },
  rejected: {
    label: "Rejected",
    className: "border-destructive/30 bg-destructive/10 text-destructive font-medium rounded-full",
  },
  pending_review: {
    label: "Pending",
    className: "border-white/[0.08] bg-white/[0.04] text-muted-foreground rounded-full",
  },
  in_progress: {
    label: "In Progress",
    className: "border-primary/30 bg-primary/10 text-primary font-medium rounded-full",
  },
  blocked: {
    label: "Blocked",
    className: "border-fault/30 bg-fault/10 text-fault font-medium rounded-full",
  },
  completed: {
    label: "Completed",
    className: "border-success/30 bg-success/10 text-success font-medium rounded-full",
  },
  success: {
    label: "Success",
    className: "border-success/30 bg-success/10 text-success font-medium rounded-full",
  },
  mock: {
    label: "Mock Run",
    className: "border-white/[0.08] bg-white/[0.04] text-muted-foreground rounded-full",
  },
  failed: {
    label: "Failed",
    className: "border-destructive/30 bg-destructive/10 text-destructive font-medium rounded-full",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? {
    label: status,
    className: "border-white/[0.08] bg-white/[0.04] text-muted-foreground rounded-full",
  };
  return (
    <Badge variant="outline" className={`px-2.5 py-0.5 text-[10px]  ${s.className}`}>
      {s.label}
    </Badge>
  );
}
