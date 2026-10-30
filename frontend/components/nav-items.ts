"use client";

import { Activity, Bot, FileText, ListChecks, Microscope, Settings, ShieldCheck, Workflow } from "lucide-react";
import type { ComponentType } from "react";

export const NAV_ITEMS: {
  title: string;
  url: string;
  Icon: ComponentType<{ className?: string }>;
  milestone?: string;
}[] = [
  { title: "Overview", url: "/app/", Icon: Activity },
  { title: "Documents", url: "/app/documents", Icon: FileText },
  { title: "AI Copilot", url: "/app/copilot", Icon: Bot },
  { title: "Agent Observatory", url: "/app/observatory", Icon: Microscope },
  { title: "Workflows", url: "/app/workflows", Icon: Workflow },
  { title: "Tasks", url: "/app/tasks", Icon: ListChecks },
  { title: "Analytics", url: "/app/analytics", Icon: Activity },
  { title: "Audit Logs", url: "/app/audit", Icon: ShieldCheck },
  { title: "Settings", url: "/app/settings", Icon: Settings },
];

