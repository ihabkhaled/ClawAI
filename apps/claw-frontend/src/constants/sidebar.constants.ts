import {
  LayoutDashboard,
  MessageSquare,
  Plug,
  Cpu,
  Route,
  Brain,
  BookOpen,
  FolderOpen,
  Shield,
  ScrollText,
  Activity,
  Settings,
} from "lucide-react";

import { ROUTES } from "./routes.constants";

export type SidebarItem = {
  labelKey: string;
  href: string;
  icon: typeof MessageSquare;
  badge?: string;
};

export const SIDEBAR_NAV_ITEMS: SidebarItem[] = [
  { labelKey: 'nav.dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { labelKey: 'nav.chat', href: ROUTES.CHAT, icon: MessageSquare },
  { labelKey: 'nav.connectors', href: ROUTES.CONNECTORS, icon: Plug },
  { labelKey: 'nav.models', href: ROUTES.MODELS, icon: Cpu },
  { labelKey: 'nav.routing', href: ROUTES.ROUTING, icon: Route },
  { labelKey: 'nav.memory', href: ROUTES.MEMORY, icon: Brain },
  { labelKey: 'nav.context', href: ROUTES.CONTEXT, icon: BookOpen },
  { labelKey: 'nav.files', href: ROUTES.FILES, icon: FolderOpen },
  { labelKey: 'nav.audits', href: ROUTES.AUDITS, icon: Shield },
  { labelKey: 'nav.logs', href: ROUTES.LOGS, icon: ScrollText },
  { labelKey: 'nav.observability', href: ROUTES.OBSERVABILITY, icon: Activity },
  { labelKey: 'nav.settings', href: ROUTES.SETTINGS, icon: Settings },
];
