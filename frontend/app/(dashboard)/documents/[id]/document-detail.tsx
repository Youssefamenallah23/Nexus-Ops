"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, X } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, type DocumentDetailDto } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const FIELD_LABELS: Record<string, string> = {
  supplier: "Supplier", reference: "Reference", amount: "Amount", currency: "Currency",
  requester: "Requester", site: "Site", due_date: "Due date", summary: "Summary",
};
const EDITABLE = ["supplier", "reference", "amount", "currency", "requester", "site", "due_date"];

export function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocumentDetailDto | null>(null);
  const [draft, setDraft] = useState<Record<string, string | number | null> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<DocumentDetailDto>(`/documents/${id}`).then((d) => {
      setDoc(d);
      setDraft(d.extractions.at(-1)?.data ?? {});
    }).catch((e) => toast.error(e.message));
  }, [id]);

  if (!doc || !draft) {
    return <div className="flex flex-col gap-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  }

  const latest = doc.extractions.at(-1)!;
  const canDecide = user?.role === "administrator" || user?.role === "manager";
  const dirty = EDITABLE.some((k) => String(draft[k] ?? "") !== String(latest.data[k] ?? ""));

  async function saveEdits() {
    setSaving(true);
    try {
      const updated = await api<DocumentDetailDto>(`/documents/${id}/extraction`, {
        method: "POST", body: JSON.stringify({ data: draft }),
      });
      setDoc(updated);
      toast.success("Corrections saved as a new revision. AI output is preserved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function decide(action: "approve" | "reject") {
    setSaving(true);
    try {
      const res = await api<{ task_department?: string }>(`/documents/${id}/${action}`, { method: "POST" });
      toast.success(action === "approve" ? `Approved - task routed to ${res.task_department}` : "Document rejected");
      router.push("/documents");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/documents" />}>
          <ArrowLeft /> Back
        </Button>
        <h2 className="text-lg font-semibold">{doc.filename}</h2>
        <StatusBadge status={doc.status} />
        <a href={`${api}/documents/${doc.id}/file`} target="_blank" rel="noreferrer"
          className="text-xs text-primary hover:underline">
          original file ↓
        </a>
        <span className="text-xs text-muted-foreground">
          {doc.doc_type.replace(/_/g, " ")}
          {doc.classification_confidence !== null && ` · ${Math.round(doc.classification_confidence * 100)}% confidence`}
        </span>
        <div className="ml-auto flex gap-2">
          {doc.status === "needs_review" && canDecide && (
            <>
              <Button size="sm" variant="destructive" disabled={saving} onClick={() => decide("reject")}>
                <X /> Reject
              </Button>
              <Button size="sm" disabled={saving} onClick={() => decide("approve")}>
                <Check /> Approve & create task
              </Button>
            </>
          )}
          {doc.status === "needs_review" && !canDecide && (
            <span className="text-xs text-muted-foreground">Your role cannot approve - ask a manager.</span>
          )}
        </div>
      </div>

      {doc.missing_fields.length > 0 && doc.status === "needs_review" && (
        <Card className="border-destructive/40">
          <CardContent className="text-sm text-destructive">
            Missing required fields: {doc.missing_fields.join(", ")}. Complete them before approval.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extracted data</CardTitle>
            <CardDescription>
              Revision {latest.revision} · {latest.created_by === "ai" ? "AI-extracted" : "human-corrected"} ·{" "}
              {Math.round(latest.confidence * 100)}% confidence · {doc.extractions.length} revision(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {Object.keys(FIELD_LABELS).map((key) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {FIELD_LABELS[key]}
                  {doc.missing_fields.includes(key) && <span className="ml-1 text-destructive">required, missing</span>}
                </label>
                {key === "summary" ? (
                  <Textarea value={String(draft[key] ?? "")} rows={2} readOnly className="bg-muted/40" />
                ) : (
                  <Input
                    value={String(draft[key] ?? "")}
                    disabled={doc.status !== "needs_review"}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  />
                )}
              </div>
            ))}
            {dirty && doc.status === "needs_review" && (
              <Button size="sm" onClick={saveEdits} disabled={saving}>Save corrections</Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Original document</CardTitle>
            <CardDescription>Raw extracted text — the source of truth for review.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-xs leading-relaxed">
              {doc.text_content || "(no text extracted)"}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

