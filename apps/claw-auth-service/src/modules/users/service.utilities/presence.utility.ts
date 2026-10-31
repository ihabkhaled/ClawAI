import { PresenceFilter, PresenceState } from '../../../common/enums';
import {
  PRESENCE_ACTIVE_WINDOW_MS,
  PRESENCE_ONLINE_WINDOW_MS,
} from '../constants/user-admin.constants';

/** ONLINE within 5 minutes, RECENT within 24 hours, otherwise (or never seen) OFFLINE. The boundary itself counts as inside. */
export function resolvePresence(lastSeenAt: Date | null, now: Date = new Date()): PresenceState {
  if (lastSeenAt === null) return PresenceState.OFFLINE;
  const age = now.getTime() - lastSeenAt.getTime();
  if (age <= PRESENCE_ONLINE_WINDOW_MS) return PresenceState.ONLINE;
  return age <= PRESENCE_ACTIVE_WINDOW_MS ? PresenceState.RECENT : PresenceState.OFFLINE;
}

/** The earliest lastSeenAt that still satisfies a list filter (use as `gte`). */
export function presenceCutoff(filter: PresenceFilter, now: Date = new Date()): Date {
  const window =
    filter === PresenceFilter.ONLINE ? PRESENCE_ONLINE_WINDOW_MS : PRESENCE_ACTIVE_WINDOW_MS;
  return new Date(now.getTime() - window);
}
