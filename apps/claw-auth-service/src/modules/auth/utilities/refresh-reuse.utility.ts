import { REFRESH_REUSE_GRACE_MS } from '../constants/token-session.constants';

/** Whether a refresh token used at `usedAt` may still be presented at `now`. */
export function isWithinReuseGrace(usedAt: Date, now: Date): boolean {
  const elapsed = now.getTime() - usedAt.getTime();
  return elapsed >= 0 && elapsed <= REFRESH_REUSE_GRACE_MS;
}
