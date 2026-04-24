import { Activity, Cpu, MessageSquare, Plug, Settings } from 'lucide-react';

import type { DashboardQuickAction, DashboardStatCard } from '@/types/dashboard.types';

import { ROUTES } from './routes.constants';

export const DASHBOARD_STALE_TIME_MS = 30_000;

export const DASHBOARD_STAT_CARD_DEFAULTS: DashboardStatCard[] = [
  { label: 'dashboard.totalThreads', value: '-', icon: MessageSquare },
  { label: 'dashboard.activeConnectors', value: '-', icon: Plug },
  { label: 'dashboard.localModels', value: '-', icon: Cpu },
  { label: 'dashboard.systemHealth', value: '-', icon: Activity },
];

/**
 * @deprecated Use DASHBOARD_STAT_CARD_DEFAULTS with use-dashboard-data hook instead.
 */
export const DASHBOARD_STAT_CARDS: DashboardStatCard[] = DASHBOARD_STAT_CARD_DEFAULTS;

export const DASHBOARD_QUICK_ACTIONS: DashboardQuickAction[] = [
  {
    label: 'dashboard.newChatLabel',
    href: ROUTES.CHAT,
    icon: MessageSquare,
    description: 'dashboard.newChatDesc',
  },
  {
    label: 'dashboard.manageConnectorsLabel',
    href: ROUTES.CONNECTORS,
    icon: Plug,
    description: 'dashboard.manageConnectorsDesc',
  },
  {
    label: 'dashboard.routingSettingsLabel',
    href: ROUTES.ROUTING,
    icon: Settings,
    description: 'dashboard.routingSettingsDesc',
  },
];
