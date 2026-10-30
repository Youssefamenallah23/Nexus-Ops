"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUp, FileText, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Citation = { document_id: string; filename: string; doc_type: string; chunk_index: number; excerpt: string; score: number };
type Answer = { answer: string; citations: Citation[]; provider: string; supported: boolean; fallback?: boolean };
const SUGGESTIONS = ["What does the Schneider supplier quote say?", "What happened during the panel R14 intervention?", "What maintenance work is described in the approved sources?"];

export default function CopilotPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexResult, setIndexResult] = useState<string | null>(null);
  const [thread, setThread] = useState<{ q: string; a: Answer }[]>([]);

  async function ask(query: string) {
    query = query.trim();
    if (!query || busy || reindexing) return;
    setQuestion(query);
    setError(null);
    setBusy(true);
    try {
      const answer = await api<Answer>("/copilot/ask", { method: "POST", body: JSON.stringify({ question: query }) });
      setThread(turns => [...turns, { q: query, a: answer }]);
      setQuestion("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The copilot could not answer. Try again.");
    } finally { setBusy(false); }
  }

  async function reindex() {
    setReindexing(true);
    setError(null);
    setIndexResult(null);
    try {
      const result = await api<{ documents: number; chunks: number }>("/copilot/reindex", { method: "POST" });
      setIndexResult(`Indexed ${result.documents} approved documents into ${result.chunks} source excerpts.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The index could not be rebuilt. Check the embedding provider.");
    } finally { setReindexing(false); }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2>Knowledge copilot</h2><p className="mt-2 text-sm text-muted-foreground">Ask about approved source documents and check the citations.{user?.role === "employee" && " Your search is limited to your department."}</p></div>
        {user?.role === "administrator" && <Button variant="outline" disabled={busy || reindexing} aria-busy={reindexing} onClick={reindex}><RefreshCw data-icon="inline-start" />{reindexing ? "Rebuilding index…" : "Rebuild source index"}</Button>}
      </div>
      {error && <Alert variant="destructive"><AlertTitle>The request did not complete</AlertTitle><AlertDescription><p>{error}</p><p>Your question is still in the input. Try again when the connection or provider is ready.</p></AlertDescription></Alert>}
      {indexResult && <Alert role="status"><AlertTitle>Source index updated</AlertTitle><AlertDescription>{indexResult}</AlertDescription></Alert>}
      {reindexing && <p role="status" className="text-sm text-muted-foreground">Rebuilding embeddings for approved sources. This can take time with a live provider.</p>}

      <form onSubmit={event => { event.preventDefault(); void ask(question); }} className="flex items-center gap-3">
        <label htmlFor="copilot-question" className="sr-only">Question about approved documents</label>
        <Input id="copilot-question" value={question} maxLength={2000} disabled={busy || reindexing} onChange={event => setQuestion(event.target.value)} placeholder="Ask about a supplier, reference, site, or intervention…" className="h-12 min-w-0 flex-1" />
        <Button type="submit" aria-label="Ask copilot" disabled={busy || reindexing || !question.trim()} aria-busy={busy}><ArrowUp data-icon="inline-start" />Ask</Button>
      </form>
      {busy && <p role="status" className="text-sm text-muted-foreground">Searching approved sources and preparing a cited answer…</p>}

      {thread.length === 0 && <section className="surface-panel p-6"><h3>Start with a fact from a document</h3><p className="mt-3 text-sm text-muted-foreground">Approve a document in <Link href="/app/documents" className="text-primary underline">Documents</Link> first. Questions about names, references, and events in the source work best. The copilot cannot report live task status from the task queue.</p><div className="mt-6 flex flex-col gap-3">{SUGGESTIONS.map(suggestion => <button type="button" key={suggestion} disabled={busy || reindexing} onClick={() => void ask(suggestion)} className="rounded-xl border border-border p-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">{suggestion}</button>)}</div></section>}

      <div role="log" aria-label="Copilot conversation" aria-live="polite" className="flex flex-col gap-6">
        {thread.map((turn, index) => <article key={index} className="flex flex-col gap-3">
          <h3 className="self-end rounded-2xl bg-secondary px-4 py-3 text-sm text-foreground">{turn.q}</h3>
          <div className="surface-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 text-xs">
              <span className="flex items-center gap-2">{turn.a.supported ? <CheckCircle2 className="size-4 text-success" /> : <AlertCircle className="size-4 text-fault" />}{turn.a.supported ? "Answer with source citations" : "The sources do not support an answer"}</span>
              <span className="text-muted-foreground">{turn.a.provider === "extractive" ? "Source excerpts" : `Provider: ${turn.a.provider}`}</span>
            </div>
            {turn.a.fallback && <p className="mt-3 text-xs text-fault">The answer model was unavailable. Showing matching source sentences instead.</p>}
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{turn.a.answer}</p>
            {turn.a.citations.length > 0 && <ol className="mt-5 flex list-none flex-col gap-3 border-t border-border pt-4">{turn.a.citations.map((citation, source) => <li key={`${citation.document_id}-${citation.chunk_index}`}><Link href={`/app/documents/${citation.document_id}`} className="flex items-start gap-2 text-sm text-primary hover:underline"><FileText className="mt-0.5 size-4 shrink-0" /><span>[{source + 1}] {citation.filename}</span></Link><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{citation.excerpt}</p></li>)}</ol>}
          </div>
        </article>)}
      </div>
    </div>
  );
}
