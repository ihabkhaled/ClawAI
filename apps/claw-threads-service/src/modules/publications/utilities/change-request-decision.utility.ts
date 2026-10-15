import type { PublicationChangeRequestStatusValue } from '../types/publication-community.types';

/**
 * Whether a request that is no longer PENDING already holds the decision being asked for: ACCEPTED
 * or APPLIED answer a repeated accept, REJECTED answers a repeated decline. A repeated decision is
 * answered, never made or announced twice.
 */
export function isSameDecision(
  current: PublicationChangeRequestStatusValue,
  wanted: 'ACCEPTED' | 'REJECTED',
): boolean {
  return wanted === 'REJECTED'
    ? current === 'REJECTED'
    : current === 'ACCEPTED' || current === 'APPLIED';
}
