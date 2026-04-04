import {
  MessageSquare,
  Plug,
  Cpu,
  Route,
  Brain,
  BookOpen,
  FolderOpen,
  Shield,
  Activity,
  Settings,
} from "lucide-react";

import { ROUTES } from "./routes.constants";

export interface SidebarItem {
  label: string;
  href: string;
  icon: typeof MessageSquare;
  badge?: string;
}

export const SIDEBAR_NAV_ITEMS: SidebarItem[] = [
  { label: "Chat", href: ROUTES.CHAT, icon: MessageSquare },
  { label: "Connectors", href: ROUTES.CONNECTORS, icon: Plug },
  { label: "Models", href: ROUTES.MODELS, icon: Cpu },
  { label: "Routing", href: ROUTES.ROUTING, icon: Route },
  { label: "Memory", href: ROUTES.MEMORY, icon: Brain },
  { label: "Context", href: ROUTES.CONTEXT, icon: BookOpen },
  { label: "Files", href: ROUTES.FILES, icon: FolderOpen },
  { label: "Audits", href: ROUTES.AUDITS, icon: Shield },
  { label: "Observability", href: ROUTES.OBSERVABILITY, icon: Activity },
  { label: "Settings", href: ROUTES.SETTINGS, icon: Settings },
];
