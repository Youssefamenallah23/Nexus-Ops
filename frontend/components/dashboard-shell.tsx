"use client";


import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "@/components/app-sidebar";
import { NAV_ITEMS } from "@/components/nav-items";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-10 rounded-2xl" />
          <Skeleton className="h-4 w-28 rounded-full" />
        </div>
      </div>
    );
  }

  const current = [...NAV_ITEMS].reverse().find((i) => pathname.replace(/\/$/, "") === i.url.replace(/\/$/, "") || (i.url !== "/app/" && pathname.startsWith(i.url + "/")));

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/login");
  }

  return (
    <SidebarProvider className="workspace">
      <AppSidebar />
      <SidebarInset className="bg-background">
        {/* Apple macOS Style Frosted Header */}
        <header className="workspace-header sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 px-6">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-white" />
          <Separator orientation="vertical" className="mr-1 h-3.5 bg-white/[0.1]" />
          <h1 className="text-sm font-medium text-foreground">{current?.title ?? "Overview"}</h1>

          {/* Minimalist Apple Pill Status Indicator */}
          <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-muted-foreground sm:flex">

            <span>Operations workspace</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden md:inline">{user.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="h-8 rounded-full border-white/[0.1] bg-white/[0.04] px-3 text-xs text-muted-foreground hover:bg-white/[0.08] hover:text-white"
            >
              Sign out
            </Button>
          </div>
        </header>

        <main className="workspace-main flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
