"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, type User } from "@/lib/api";
import { ArrowLeft, Shield, UserCheck, ShieldCheck } from "lucide-react";
import { Magnetic } from "@/components/landing/magnetic";

const DEMO_ACCOUNTS = [
  { email: "admin@nexus.test", name: "Claire Moreau", role: "Administrator", dept: "Operations Command" },
  { email: "manager@nexus.test", name: "Thomas Le Goff", role: "Manager", dept: "High Voltage Grid" },
  { email: "employee@nexus.test", name: "Lucas Petit", role: "Employee", dept: "Renewables Field" },
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
      toast.success(`Signed in as ${user.name}`);
      window.location.assign("/app");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page relative flex min-h-svh flex-col items-center justify-center bg-black px-6 py-12 text-foreground">
      {/* Background Ambient Radial Sheen */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,var(--signal-wash),transparent_80%)]" />

      {/* Top Back Link */}
      <div className="absolute top-8 left-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3.5" />
          Back to Overview
        </Link>
      </div>

      <div className="login-panel relative z-10 w-full max-w-md">
        {/* Apple ID Style Header */}
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-white shadow-[0_8px_24px_var(--shadow-deep)]">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
            Sign in to NEXUS OPS
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Select a verified demo account to explore role-specific permissions.
          </p>
        </div>

        {/* Demo Account Selector */}
        <div className="mt-8 flex flex-col gap-2">
          {DEMO_ACCOUNTS.map((a) => {
            const isSelected = email === a.email;
            return (
              <button
                key={a.email}
                type="button"
                aria-pressed={isSelected} onClick={() => setEmail(a.email)}
                className={`group flex items-center justify-between rounded-xl border p-3.5 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/[0.08] shadow-[0_4px_20px_var(--signal-wash)]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-8 items-center justify-center rounded-full text-xs font-medium ${
                      isSelected ? "bg-primary text-white" : "bg-white/[0.08] text-muted-foreground"
                    }`}
                  >
                    {a.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white group-hover:text-primary transition-colors">
                      {a.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {a.email} / {a.dept}
                    </div>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    a.role === "Administrator"
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : a.role === "Manager"
                      ? "bg-[var(--fault)]/10 text-[var(--fault)] border border-[var(--fault)]/20"
                      : "bg-white/[0.06] text-muted-foreground border border-white/[0.08]"
                  }`}
                >
                  {a.role}
                </span>
              </button>
            );
          })}
        </div>

        {/* Credentials Form */}
        <form onSubmit={submit} className="mt-6 border-t border-border pt-6">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="email" className="text-xs text-muted-foreground">
                Email Address
              </FieldLabel>
              <Input
                id="email"
                type="email" autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-10 rounded-xl border-white/[0.1] bg-white/[0.04] text-xs text-white placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password" className="text-xs text-muted-foreground">
                Password
              </FieldLabel>
              <Input
                id="password"
                type="password" autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-10 rounded-xl border-white/[0.1] bg-white/[0.04] text-xs text-white placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                required
              />
            </Field>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full rounded-full bg-white text-xs font-semibold text-black shadow-[0_4px_16px_var(--highlight)] hover:bg-white/90 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Continue to Platform"}
            </Button>
          </FieldGroup>
        </form>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Protected by role-based server-side session authentication.
        </p>
      </div>
    </div>
  );
}
