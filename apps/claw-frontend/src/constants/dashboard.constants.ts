import { Activity, Cpu, MessageSquare, Plug, Settings } from 'lucide-react';

import type { DashboardQuickAction, DashboardStatCard } from '@/types/dashboard.types';

import { ROUTES } from './routes.constants';

export const DASHBOARD_STALE_TIME_MS = 30_000;

export const DASHBOARD_STAT_CARD_DEFAULTS: DashboardStatCard[] = [
  { label: 'Total Threads', value: '-', icon: MessageSquare },
  { label: 'Active Connectors', value: '-', icon: Plug },
  { label: 'Local Models', value: '-', icon: Cpu },
  { label: 'System Health', value: '-', icon: Activity },
];

/**
 * @deprecated Use DASHBOARD_STAT_CARD_DEFAULTS with use-dashboard-data hook instead.
 */
export const DASHBOARD_STAT_CARDS: DashboardStatCard[] = DASHBOARD_STAT_CARD_DEFAULTS;

export const DASHBOARD_QUICK_ACTIONS: DashboardQuickAction[] = [
  {
    label: 'New Chat',
    href: ROUTES.CHAT,
    icon: MessageSquare,
    description: 'Start a new AI conversation thread',
  },
  {
    label: 'Manage Connectors',
    href: ROUTES.CONNECTORS,
    icon: Plug,
    description: 'Configure your AI provider connections',
  },
  {
    label: 'Routing Settings',
    href: ROUTES.ROUTING,
    icon: Settings,
    description: 'Adjust model routing and fallback rules',
  },
];
