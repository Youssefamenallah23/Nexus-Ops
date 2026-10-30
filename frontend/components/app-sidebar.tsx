"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { NAV_ITEMS } from "@/components/nav-items";

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <Sidebar className="border-r border-white/[0.06] bg-[var(--card)]">
      {/* Apple-style Brand Header */}
      <SidebarHeader className="border-b border-white/[0.04] px-5 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl border border-input bg-secondary text-foreground">
            <Box className="size-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-tight text-white">NEXUS OPS</span>
            <span className="text-xs text-muted-foreground">Operations workspace</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-medium  text-muted-foreground/70">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.replace(/\/$/, "") === item.url.replace(/\/$/, "") || (item.url !== "/app/" && pathname.startsWith(item.url + "/"));
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      className={`h-11 rounded-xl px-3 text-sm transition-colors ${
                        isActive
                          ? "bg-white/[0.1] font-medium text-white shadow-[0_1px_4px_var(--shadow-deep)]"
                          : "text-muted-foreground hover:bg-white/[0.04] hover:text-white"
                      }`}
                      render={<Link href={item.url} />}
                    >
                      <item.Icon className={`size-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/[0.04] p-3.5">
        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-xs font-medium text-white">
            {user?.name.charAt(0) ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-white">{user?.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.role}</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
