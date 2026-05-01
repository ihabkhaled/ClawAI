import type { AiActionRiskLabel } from '@/types/workspace.types';

/**
 * Stream 10/40 — visual styling for AI-action risk badges shown on the
 * approval card. Colour-blind safe: we pair colour with labels so visual
 * distinction is not the only signal.
 */
export const WORKSPACE_RISK_LABEL_STYLES: Record<AiActionRiskLabel, string> = {
  LOW: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  MEDIUM: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  HIGH: 'border-orange-500/50 bg-orange-500/15 text-orange-600 dark:text-orange-400',
  CRITICAL: 'border-red-600/60 bg-red-600/15 text-red-600 dark:text-red-400 font-semibold',
};
