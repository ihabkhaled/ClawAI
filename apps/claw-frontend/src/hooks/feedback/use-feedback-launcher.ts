'use client';

import { useRef } from 'react';

import { FLOATING_RAIL_CLEARANCE_CONFIG } from '@/constants/floating-obstacle.constants';
import { useFloatingObstacleClearance } from '@/hooks/layout/use-floating-obstacle-clearance';
import type { UseFeedbackLauncherReturn } from '@/types';

/**
 * Keeps the floating rail above whatever owns the bottom of the page.
 *
 * The launcher is the rail's permanent resident, so it is the one that
 * measures. On a thread page the composer occupies the bottom-end corner, and
 * the launcher sat on top of it — covering the "Preview context" button whole
 * and clipping the message box. That is the same tap-stealing failure the rail
 * slots were introduced to end, one layer up.
 *
 * The launcher's own box is passed as the column: clearance only counts an
 * obstacle that actually sits under this button, so a composer on a page where
 * the rail is elsewhere does not move it.
 */
export function useFeedbackLauncher(): UseFeedbackLauncherReturn {
  const launcherRef = useRef<HTMLButtonElement | null>(null);

  useFloatingObstacleClearance(launcherRef, FLOATING_RAIL_CLEARANCE_CONFIG);

  return { launcherRef };
}
