import { type QuotaWindow } from '@claw/shared-types';

/**
 * The three plan columns that cap token spend over a rolling window.
 *
 * Optional and nullable on purpose: an update DTO carries only what changed,
 * and `null` on a column means unlimited rather than absent.
 */
export type QuotaWindowQuotas = {
  dailyTokenQuota?: number | null;
  weeklyTokenQuota?: number | null;
  monthlyTokenQuota?: number | null;
};

/**
 * One rung of the window ladder: the window, and how to read its cap.
 *
 * A reader rather than a column name, so the walk never indexes an object by a
 * computed key — which is both a lint finding and a real footgun the moment a
 * key can come from anywhere but this file.
 */
export type QuotaWindowRung = {
  window: QuotaWindow;
  read: (quotas: QuotaWindowQuotas) => number | null | undefined;
};

/** A shorter window allowing more than the longer window that contains it. */
export type QuotaWindowConflict = {
  shorter: QuotaWindow;
  longer: QuotaWindow;
  shorterValue: number;
  longerValue: number;
};
