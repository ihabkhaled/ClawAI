import { Activity, Cpu, MessageSquare, Plug, Settings } from 'lucide-react';

import { DashboardStatGradient } from '@/enums';
import type { DashboardQuickAction, DashboardStatCard } from '@/types/dashboard.types';

import { ROUTES } from './routes.constants';

export const DASHBOARD_STALE_TIME_MS = 30_000;

// Time-of-day greeting cutoffs (24h). 5–11 = morning, 12–17 = afternoon,
// 18–4 = evening. Edges align with the design-system spec.
export const DASHBOARD_GREETING_MORNING_HOUR_MIN = 5;
export const DASHBOARD_GREETING_AFTERNOON_HOUR_MIN = 12;
export const DASHBOARD_GREETING_EVENING_HOUR_MIN = 18;

// Tailwind class triplets per gradient. Keys map directly onto
// DashboardStatGradient enum values so the page never composes class strings.
// `overlay` is the soft top-right blob (group-hover scale-110 + opacity-bump).
// `iconBg` is the rounded-square behind the lucide icon.
// `iconText` is the icon color on top of `iconBg`.
export const DASHBOARD_STAT_GRADIENT_STYLES: Record<
  DashboardStatGradient,
  { readonly overlay: string; readonly iconBg: string; readonly iconText: string }
> = {
  [DashboardStatGradient.BRAND]: {
    overlay:
      'bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_60%)]',
    iconBg: 'bg-primary/12',
    iconText: 'text-primary',
  },
  [DashboardStatGradient.SUCCESS]: {
    overlay:
      'bg-[radial-gradient(circle_at_top_right,hsl(var(--accent-teal)/0.22),transparent_60%)]',
    iconBg: 'bg-success/12',
    iconText: 'text-success',
  },
  [DashboardStatGradient.WARM]: {
    overlay:
      'bg-[radial-gradient(circle_at_top_right,hsl(var(--accent-amber)/0.22),transparent_60%)]',
    iconBg: 'bg-warning/12',
    iconText: 'text-warning',
  },
  [DashboardStatGradient.INFO]: {
    overlay:
      'bg-[radial-gradient(circle_at_top_right,hsl(var(--accent-purple)/0.22),transparent_60%)]',
    iconBg: 'bg-info/12',
    iconText: 'text-info',
  },
};

export const DASHBOARD_STAT_CARD_DEFAULTS: DashboardStatCard[] = [
  {
    label: 'dashboard.totalThreads',
    value: '-',
    icon: MessageSquare,
    gradient: DashboardStatGradient.BRAND,
  },
  {
    label: 'dashboard.activeConnectors',
    value: '-',
    icon: Plug,
    gradient: DashboardStatGradient.INFO,
  },
  {
    label: 'dashboard.localModels',
    value: '-',
    icon: Cpu,
    gradient: DashboardStatGradient.WARM,
  },
  {
    label: 'dashboard.systemHealth',
    value: '-',
    icon: Activity,
    gradient: DashboardStatGradient.SUCCESS,
  },
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
