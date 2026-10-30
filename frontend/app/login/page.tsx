"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, type User } from "@/lib/api";

const DEMO_ACCOUNTS = [
  { email: "admin@nexus.test", name: "Claire Moreau", role: "Administrator" },
  { email: "manager@nexus.test", name: "Thomas Le Goff", role: "Manager" },
  { email: "employee@nexus.test", name: "Lucas Petit", role: "Employee" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("admin@nexus.test");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await api<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      toast.success(`Welcome, ${user.name}`);
      // Full reload so AuthProvider refetches /auth/me with the new session cookie.
      window.location.assign("/app");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.2fr_1fr]">
      {/* Control-room wall */}
      <div className="relative hidden flex-col justify-between border-r p-10 lg:flex">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-[var(--voltage)] shadow-[0_0_8px_rgba(2,151,222,0.9)]" />
          system nominal
        </div>
        <div className="max-w-lg">
          <h1 className="text-6xl font-semibold tracking-tighter text-foreground">
            NEXUS<span className="text-primary"> OPS</span>
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            Every document classified, validated and routed by AI â€” with a person
            approving every consequential action.
          </p>
        </div>
        <div className="tnum flex gap-8 text-xs text-muted-foreground">
          <span>GEMINI 3.5 FLASH-LITE</span>
          <span className="text-[var(--fault)]">HUMAN-IN-THE-LOOP</span>
          <span>PGVECTOR READY</span>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a demo terminal â€” no password in this sandbox.
          </p>
          <form onSubmit={submit} className="mt-8">
            <FieldGroup>
              <div className="flex flex-col gap-1.5">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => setEmail(a.email)}
                    className={`flex items-center justify-between border px-3 py-2.5 text-left text-sm transition-colors ${
                      email === a.email
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                    }`}
                  >
                    <span>
                      {a.name}
                      <span className="tnum block text-xs opacity-70">{a.email}</span>
                    </span>
                    <span className={`tnum text-xs ${a.role === "Employee" ? "text-muted-foreground" : "text-primary"}`}>
                      {a.role}
                    </span>
                  </button>
                ))}
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Connectingâ€¦" : "Enter the hub"}
              </Button>
            </FieldGroup>
          </form>
        </div>
      </div>
    </div>
  );
}

