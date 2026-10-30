"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, UploadCloud, FileText } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, type DocumentRow } from "@/lib/api";

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback((statusFilter: string, signal?: AbortSignal) => {
    api<DocumentRow[]>(`/documents${statusFilter ? `?status=${statusFilter}` : ""}`, { signal })
      .then((rows) => { if (!signal?.aborted) { setDocs(rows); setError(null); } })
      .catch((e) => {
        if (!signal?.aborted) setError(e.message);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(status, controller.signal);
    return () => controller.abort();
  }, [status, load]);

  async function upload() {
    if (!file) return;
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      setUploadError("Choose a non-empty file smaller than 10 MB.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const doc = await api<DocumentRow>("/documents", { method: "POST", body: fd });
      toast.success(
        `Classified as ${doc.doc_type.replace(/_/g, " ")} (${Math.round((doc.latest_confidence ?? 0) * 100)}% confidence)`
      );
      setFile(null);
      setUploadOpen(false);
      router.push(`/app/documents/${doc.id}`);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Documents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload a document, review the extracted fields, then approve or reject the proposed work.
          </p>
        </div>

        <div className="document-toolbar flex items-center gap-3">
          {/* Apple-style Filter Pills */}
          <div className="document-filters flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
            {[
              { id: "", label: "All" },
              { id: "needs_review", label: "Needs Review" },
              { id: "approved", label: "Approved" },
              { id: "rejected", label: "Rejected" },
            ].map((s) => (
              <button
                key={s.id}
                aria-pressed={status === s.id}
                onClick={() => { if (status !== s.id) { setDocs(null); setError(null); setStatus(s.id); } }}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                  status === s.id
                    ? "bg-white text-black shadow-sm"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <Dialog open={uploadOpen} onOpenChange={(open) => { if (!uploading) setUploadOpen(open); }}>
            <DialogTrigger
              render={
                <Button className="rounded-full bg-white px-4 text-xs font-semibold text-black hover:bg-white/90">
                  <Plus className="size-3.5" /> Upload
                </Button>
              }
            />
            <DialogContent className="rounded-2xl border-white/[0.1] bg-[var(--card)] p-6 backdrop-blur-2xl">
              <DialogHeader>
                <DialogTitle className="text-base text-white">Upload Document</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  PDF, DOCX, TXT or CSV up to 10 MB. The multi-agent pipeline extracts fields
                  and halts at a human checkpoint for approval.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.15] bg-white/[0.02] p-6 text-center">
                  <UploadCloud className="size-8 text-muted-foreground" />
                  <Input
                    aria-label="Choose a document to upload"
                    type="file"
                    accept=".pdf,.docx,.txt,.csv"
                    disabled={uploading}
                    onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploadError(null); }}
                    className="mt-3 text-xs"
                  />
                </div>
                {uploadError && <Alert variant="destructive"><AlertTitle>Upload did not complete</AlertTitle><AlertDescription>{uploadError}</AlertDescription></Alert>}
                {uploading && <p role="status" className="text-sm text-muted-foreground">Extracting fields and running checks. Live model providers can take a few minutes. Your review will open when processing finishes.</p>}
                <Button
                  onClick={upload}
                  disabled={!file || uploading}
                  aria-busy={uploading}
                  className="rounded-full bg-white text-xs font-semibold text-black hover:bg-white/90"
                >
                  {uploading ? "Analyzing Document..." : "Start Pipeline Run"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--card)]/80 backdrop-blur-2xl">
        {error ? (
          <Alert variant="destructive"><AlertTitle>Documents could not be loaded</AlertTitle><AlertDescription><p>{error}</p><Button variant="outline" onClick={() => { setError(null); setDocs(null); load(status); }}>Try again</Button></AlertDescription></Alert>
        ) : docs === null ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl bg-white/[0.03]" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            No documents matching the selected filter.
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-white/[0.06] bg-white/[0.02]">
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">Filename</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Type</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Validation</TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">Uploader</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow
                  key={d.id}
                  className="border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                >
                  <TableCell className="py-4">
                    <Link
                      href={`/app/documents/${d.id}`}
                      className="font-medium text-white hover:text-primary transition-colors flex items-center gap-2"
                    >
                      <FileText className="size-3.5 text-muted-foreground" />
                      {d.filename}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">
                    {d.doc_type.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="text-xs">
                    {d.missing_fields.length > 0 ? (
                      <span className="text-fault font-medium">
                        {d.missing_fields.length} requires attention
                      </span>
                    ) : (
                      <span className="text-[var(--success)] font-medium">Verified</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.uploader_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
