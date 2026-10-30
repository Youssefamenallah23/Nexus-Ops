"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, X, Download, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, API, type DocumentDetailDto } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const FIELD_LABELS: Record<string, string> = {
  supplier: "Supplier", reference: "Reference number", amount: "Amount", currency: "Currency",
  requester: "Requester", site: "Facility or site", due_date: "Due date", summary: "Summary",
};

export function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocumentDetailDto | null>(null);
  const [draft, setDraft] = useState<Record<string, string | number | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ action: "approve" | "reject"; department?: string } | null>(null);

  const load = useCallback((signal?: AbortSignal) => {
    api<DocumentDetailDto>(`/documents/${id}`, { signal }).then((document) => {
      if (signal?.aborted) return;
      setDoc(document);
      setDraft(document.extractions.at(-1)?.data ?? {});
      setError(null);
      setDecision(null);
    }).catch((reason) => { if (!signal?.aborted) setError(reason.message); });
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (error) return <Alert variant="destructive"><AlertTitle>Document could not be loaded</AlertTitle><AlertDescription><p>{error}</p><Button variant="outline" onClick={() => { setError(null); setDoc(null); load(); }}>Try again</Button><Link href="/app/documents">Back to documents</Link></AlertDescription></Alert>;
  if (!doc) return <div className="flex flex-col gap-4"><Skeleton className="h-10 w-64 rounded-xl" /><Skeleton className="h-[500px] rounded-2xl" /></div>;

  const latest = doc.extractions.at(-1);
  const canDecide = user?.role === "administrator" || user?.role === "manager";
  const dirty = Object.keys(FIELD_LABELS).some(key => String(draft[key] ?? "") !== String(latest?.data[key] ?? ""));

  async function saveEdits() {
    setSaving(true);
    try {
      const data = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, typeof value === "string" ? value.trim() || null : value]));
      const updated = await api<DocumentDetailDto>(`/documents/${id}/extraction`, { method: "POST", body: JSON.stringify({ data }) });
      setDoc(updated);
      setDraft(updated.extractions.at(-1)?.data ?? {});
      toast.success("Corrections saved as a new revision.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Corrections could not be saved. Try again.");
    } finally { setSaving(false); }
  }

  async function decide(action: "approve" | "reject") {
    if (saving || (action === "approve" && dirty)) return;
    setSaving(true);
    try {
      const result = await api<{ task_department?: string }>(`/documents/${id}/${action}`, { method: "POST" });
      setDoc(current => current ? { ...current, status: action === "approve" ? "approved" : "rejected", reviewer_name: user?.name ?? null } : current);
      setDecision({ action, department: result.task_department });
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Decision could not be saved. Try again.");
    } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="review-steps" aria-label="Document workflow">
        <li>1. Upload complete</li><li aria-current={doc.status === "needs_review" ? "step" : undefined}>2. Review fields</li><li aria-current={doc.status !== "needs_review" ? "step" : undefined}>3. {doc.status === "needs_review" ? "Approve or reject" : "Decision recorded"}</li>
      </ol>
      <div className="document-review-header flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link href="/app/documents" aria-label="Back to documents" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /></Link>
          <h2 className="min-w-0">{doc.filename}</h2><StatusBadge status={doc.status} />
          {doc.original_file_available ? <a href={`${API}/documents/${doc.id}/file`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><Download className="size-4" />Original file</a> : <span className="text-sm text-muted-foreground">Source text available below</span>}
        </div>
        {doc.status === "needs_review" && canDecide && <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Button variant="destructive" disabled={saving} onClick={() => decide("reject")}><X data-icon="inline-start" />Reject</Button>
          <Button disabled={saving || dirty} aria-busy={saving} onClick={() => decide("approve")}><Check data-icon="inline-start" />Approve and create task</Button>
        </div>}
      </div>

      {decision && <Alert role="status"><AlertTitle>{decision.action === "approve" ? "Approved. Your task is ready." : "Document rejected."}</AlertTitle><AlertDescription>
        <p>{decision.action === "approve" ? `A task was created${decision.department ? ` for ${decision.department}` : ""}. Check Workflows for webhook delivery status.` : "The review is closed. Approval automation was not dispatched."}</p>
        <div className="review-next-actions">{decision.action === "approve" && <><Link href="/app/tasks">View tasks</Link><Link href="/app/workflows">Check delivery</Link><Link href="/app/copilot">Open copilot</Link></>}<Link href="/app/documents">Back to documents</Link></div>
      </AlertDescription></Alert>}
      {doc.status === "needs_review" && <p className="text-sm text-muted-foreground">Compare the extracted fields with the source. Save corrections before making a decision.{!canDecide && " A manager or administrator must approve or reject this document."}</p>}
      {dirty && doc.status === "needs_review" && <Alert><AlertTitle>Unsaved corrections</AlertTitle><AlertDescription>Save your changes before approving. Approval uses the last saved revision.</AlertDescription></Alert>}
      {doc.missing_fields.length > 0 && doc.status === "needs_review" && <Alert><AlertCircle /><AlertTitle>Required information is missing</AlertTitle><AlertDescription>Review and correct: {doc.missing_fields.map(key => FIELD_LABELS[key] ?? key).join(", ")}.</AlertDescription></Alert>}
      {doc.qa_issues?.length > 0 && <Alert><AlertCircle /><AlertTitle>Intake checks to review</AlertTitle><AlertDescription><p>These checks describe the intake extraction. Review them alongside any saved human corrections.</p><ul className="list-disc pl-5">{doc.qa_issues.map(issue => <li key={issue}>{issue}</li>)}</ul></AlertDescription></Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-panel p-6">
          <h3>Extracted fields</h3><p className="mt-2 text-sm text-muted-foreground">{latest ? `Revision ${latest.revision}, ${latest.created_by === "ai" ? "AI extraction" : "human correction"}, ${Math.round(latest.confidence * 100)}% confidence.` : "No extraction revision is available."}</p>
          <div className="mt-6 flex flex-col gap-4">
            {Object.entries(FIELD_LABELS).map(([key, label]) => <div key={key} className="flex flex-col gap-2">
              <Label htmlFor={`field-${key}`}>{label}{doc.missing_fields.includes(key) ? " (required)" : ""}</Label>
              {key === "summary" ? <Textarea id={`field-${key}`} value={String(draft[key] ?? "")} rows={3} disabled={doc.status !== "needs_review" || saving} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
                : <Input id={`field-${key}`} type={key === "amount" ? "number" : key === "due_date" ? "date" : "text"} min={key === "amount" ? 0 : undefined} max={key === "amount" ? 10000000 : undefined} step={key === "amount" ? "any" : undefined} value={String(draft[key] ?? "")} disabled={doc.status !== "needs_review" || saving} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />}
            </div>)}
            {dirty && doc.status === "needs_review" && <Button onClick={saveEdits} disabled={saving} aria-busy={saving}>{saving ? "Saving corrections…" : "Save corrections"}</Button>}
          </div>
        </section>
        <section className="surface-panel p-6">
          <h3>Source document text</h3><p className="mt-2 text-sm text-muted-foreground">Use the original wording to check the extracted values.</p>
          <pre className="mt-6 max-h-[640px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-background p-4 font-mono text-sm leading-relaxed text-foreground">{doc.text_content || "No source text is available."}</pre>
        </section>
      </div>
    </div>
  );
}
