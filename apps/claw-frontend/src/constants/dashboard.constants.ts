import { MessageSquare, Plug, Cpu, Route, Settings } from "lucide-react";

import type { DashboardQuickAction, DashboardStatCard } from "@/types/dashboard.types";

import { ROUTES } from "./routes.constants";

export const DASHBOARD_STAT_CARDS: DashboardStatCard[] = [
  { label: "Total Threads", value: 0, icon: MessageSquare },
  { label: "Active Connectors", value: 0, icon: Plug },
  { label: "Local Models", value: 0, icon: Cpu },
  { label: "Routing Decisions Today", value: 0, icon: Route },
];

export const DASHBOARD_QUICK_ACTIONS: DashboardQuickAction[] = [
  {
    label: "New Chat",
    href: ROUTES.CHAT,
    icon: MessageSquare,
    description: "Start a new AI conversation thread",
  },
  {
    label: "Manage Connectors",
    href: ROUTES.CONNECTORS,
    icon: Plug,
    description: "Configure your AI provider connections",
  },
  {
    label: "Routing Settings",
    href: ROUTES.ROUTING,
    icon: Settings,
    description: "Adjust model routing and fallback rules",
  },
];
