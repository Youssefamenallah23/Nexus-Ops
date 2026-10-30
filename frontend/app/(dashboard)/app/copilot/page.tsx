"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Citation = {
  document_id: string;
  filename: string;
  doc_type: string;
  chunk_index: number;
  excerpt: string;
  score: number;
};

type Answer = {
  answer: string;
  citations: Citation[];
  provider: string;
  supported: boolean;
};

export default function CopilotPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState<{ q: string; a: Answer }[]>([]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    try {
      const a = await api<Answer>("/copilot/ask", {
        method: "POST",
        body: JSON.stringify({ question }),
      });
      setThread((t) => [{ q: question, a }, ...t]);
      setQuestion("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Copilot unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Knowledge copilot</h2>
        <p className="text-sm text-muted-foreground">
          Answers come only from approved documents you can access, with citations.
          {user?.role === "employee" && " You see sources from your department."}
        </p>
      </div>

      <form onSubmit={ask} className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What happened on panel R14?"
          className="h-10"
        />
        <Button type="submit" disabled={busy || !question.trim()} className="h-10 px-4">
          {busy ? "Searching…" : <><CornerDownLeft /> Ask</>}
        </Button>
      </form>

      {thread.length === 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 py-10 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto size-6 text-primary" />
            Ask about interventions, maintenance schedules, supplier quotes or meeting
            decisions. The copilot answers from approved documents only — and tells you
            when they do not support an answer.
          </CardContent>
        </Card>
      )}

      {thread.map((turn, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="self-end rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm">
            {turn.q}
          </div>
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`size-1.5 rounded-full ${turn.a.supported ? "bg-[var(--voltage)]" : "bg-[var(--fault)]"}`} />
                <span className="tnum">{turn.a.provider}</span>
                {!turn.a.supported && <span className="text-[var(--fault)]">not supported by sources</span>}
              </div>
              <p className="text-sm leading-relaxed">{turn.a.answer}</p>
              {turn.a.citations.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  {turn.a.citations.map((c, ci) => (
                    <Link
                      key={`${c.document_id}-${c.chunk_index}`}
                      href={`/documents/${c.document_id}`}
                      className="rounded border border-border p-3 text-xs transition-colors hover:border-primary/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="tnum font-medium text-primary">[{ci + 1}] {c.filename}</span>
                        <span className="tnum text-muted-foreground">{(c.score * 100).toFixed(0)}%</span>
                      </div>
                      <p className="mt-1 line-clamp-3 leading-relaxed text-muted-foreground">{c.excerpt}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
