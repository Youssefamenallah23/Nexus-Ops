"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, type User } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@nexus.test");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await api<User>("/auth/login", { method: "POST", body: JSON.stringify({ email }) });
      toast.success(`Welcome, ${user.name}`);
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold tracking-tight">NEXUS OPS</CardTitle>
          <CardDescription>
            AI Workflow &amp; Operations Hub. Sign in with a demo account — no password in this
            sandbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nexus.test"
                  required
                />
              </Field>
              <Button type="submit" disabled={loading} className="w-full">
                Sign in
              </Button>
            </FieldGroup>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Demo accounts: admin@nexus.test (administrator), manager@nexus.test (manager),
            employee@nexus.test (employee).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
