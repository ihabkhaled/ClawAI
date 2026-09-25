import { CircleCheck, CircleHelp, CircleX, TriangleAlert } from 'lucide-react';

import { ComponentState, StatusComponent, UptimeWindow } from '@/enums';
import type { ComponentStateAppearance } from '@/types';

/** The i18n key naming each status component. */
export const STATUS_COMPONENT_LABEL_KEYS: Readonly<Record<StatusComponent, string>> = {
  [StatusComponent.ACCOUNTS]: 'observability.status.components.accounts',
  [StatusComponent.CHAT]: 'observability.status.components.chat',
  [StatusComponent.FILES]: 'observability.status.components.files',
  [StatusComponent.ANTIVIRUS]: 'observability.status.components.antivirus',
  [StatusComponent.IMAGES]: 'observability.status.components.images',
  [StatusComponent.RESEARCH]: 'observability.status.components.research',
  [StatusComponent.PAYMENTS]: 'observability.status.components.payments',
  [StatusComponent.WORKSPACES]: 'observability.status.components.workspaces',
  [StatusComponent.CODING_AGENT]: 'observability.status.components.codingAgent',
  [StatusComponent.LOCAL_MODELS]: 'observability.status.components.localModels',
  [StatusComponent.PLATFORM]: 'observability.status.components.platform',
};

/** The i18n key naming each uptime window. */
export const UPTIME_WINDOW_LABEL_KEYS: Readonly<Record<UptimeWindow, string>> = {
  [UptimeWindow.DAY]: 'observability.status.windows.day',
  [UptimeWindow.WEEK]: 'observability.status.windows.week',
  [UptimeWindow.MONTH]: 'observability.status.windows.month',
};

/**
 * How each state is shown. The text label is always rendered; the icon and
 * the colour repeat it, so the state never depends on colour alone. Every
 * text colour clears 4.5:1 on the card background in both themes.
 */
export const COMPONENT_STATE_APPEARANCE: Readonly<
  Record<ComponentState, ComponentStateAppearance>
> = {
  [ComponentState.UP]: {
    labelKey: 'observability.status.states.up',
    icon: CircleCheck,
    className: 'text-emerald-700 dark:text-emerald-400',
  },
  [ComponentState.DEGRADED]: {
    labelKey: 'observability.status.states.degraded',
    icon: TriangleAlert,
    className: 'text-amber-800 dark:text-amber-300',
  },
  [ComponentState.DOWN]: {
    labelKey: 'observability.status.states.down',
    icon: CircleX,
    className: 'text-red-700 dark:text-red-400',
  },
  [ComponentState.UNKNOWN]: {
    labelKey: 'observability.status.states.unknown',
    icon: CircleHelp,
    className: 'text-muted-foreground',
  },
};

/** Below this coverage (basis points) an uptime figure says how much of the window it measured. */
export const STATUS_FULL_COVERAGE_BASIS_POINTS = 9_900;

/** Uptime is integer basis points from the API: 10,000 = 100 %. */
export const STATUS_BASIS_POINTS_PER_UNIT = 10_000;
