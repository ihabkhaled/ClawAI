import { PluginConsentStatus } from '@/enums/plugin-consent-card.enum';
import type { PluginConsentRequestView } from '@/types/plugin-consent-card.types';

/** Whole seconds until the request lapses, never negative. */
export function secondsLeft(expiresAt: string, now: number): number {
  const deadline = Date.parse(expiresAt);
  return Number.isNaN(deadline) ? 0 : Math.max(Math.ceil((deadline - now) / 1000), 0);
}

/** A request the user can still answer: pending and not past its deadline. */
export function isOpenRequest(request: PluginConsentRequestView, now: number): boolean {
  return request.status === PluginConsentStatus.Pending && secondsLeft(request.expiresAt, now) > 0;
}
