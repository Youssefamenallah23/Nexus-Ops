"use client";

import { Activity, Bot, FileText, ListChecks, Microscope, Settings, ShieldCheck, Workflow } from "lucide-react";
import type { ComponentType } from "react";

export const NAV_ITEMS: {
  title: string;
  url: string;
  Icon: ComponentType<{ className?: string }>;
  milestone?: string;
}[] = [
  { title: "Overview", url: "/", Icon: Activity },
  { title: "Documents", url: "/documents", Icon: FileText },
  { title: "AI Copilot", url: "/copilot", Icon: Bot },
  { title: "Agent Observatory", url: "/observatory", Icon: Microscope },
  { title: "Workflows", url: "/workflows", Icon: Workflow },
  { title: "Tasks", url: "/tasks", Icon: ListChecks },
  { title: "Analytics", url: "/analytics", Icon: Activity },
  { title: "Audit Logs", url: "/audit", Icon: ShieldCheck },
  { title: "Settings", url: "/settings", Icon: Settings },
];
