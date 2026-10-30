"use client";

import { Bot, FileText, LayoutDashboard, ListChecks, Settings, ShieldCheck, Workflow, Activity } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="size-4" />
          </div>
          <div className="grid leading-tight">
            <span className="text-sm font-semibold">NEXUS OPS</span>
            <span className="text-xs text-muted-foreground">Operations Hub</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton isActive={pathname === item.url} tooltip={item.title}
                    render={<Link href={item.url} className={item.milestone ? "opacity-60" : undefined} />}>
                    <item.Icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {user ? (
            <>
              <div className="font-medium text-foreground">{user.name}</div>
              <div>{user.role} · {user.department}</div>
            </>
          ) : (
            "Not signed in"
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
