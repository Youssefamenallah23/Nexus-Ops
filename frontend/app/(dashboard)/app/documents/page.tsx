"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [status, setStatus] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback((statusFilter: string) => {
    setDocs(null);
    api<DocumentRow[]>(`/documents${statusFilter ? `?status=${statusFilter}` : ""}`)
      .then(setDocs)
      .catch((e) => { toast.error(e.message); setDocs([]); });
  }, []);

  useEffect(() => { load(status); }, [status, load]);

  async function upload() {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const doc = await api<DocumentRow>("/documents", { method: "POST", body: fd });
      toast.success(`Classified as ${doc.doc_type.replace(/_/g, " ")} (${Math.round((doc.latest_confidence ?? 0) * 100)}% confidence)`);
      setFile(null);
      load(status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {["", "needs_review", "approved", "rejected"].map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}>
              {s === "" ? "All" : s.replace("_", " ")}
            </Button>
          ))}
        </div>
        <Dialog>
          <DialogTrigger render={<Button size="sm"><Plus /> Upload document</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload a document</DialogTitle>
              <DialogDescription>
                PDF, DOCX, TXT or CSV up to 10 MB. The AI classifies it and extracts fields;
                a human always validates before anything is executed.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input type="file" accept=".pdf,.docx,.txt,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <Button onClick={upload} disabled={!file || uploading}>
                {uploading ? "Processing…" : "Upload & process"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document center</CardTitle>
          <CardDescription>
            AI-classified business documents awaiting human validation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {docs === null ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : docs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No documents in this view.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Missing fields</TableHead>
                  <TableHead>Uploaded by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/documents/${d.id}`} className="font-medium hover:underline">
                        {d.filename}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.doc_type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell>
                      {d.missing_fields.length > 0 ? (
                        <span className="text-xs text-destructive">
                          {d.missing_fields.length} missing
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">complete</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.uploader_name}</TableCell>
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
