import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard-shell";

// Cookie-based auth gate: block rendering until the session is known.
export const instant = false;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await cookies();
  return <DashboardShell>{children}</DashboardShell>;
}
