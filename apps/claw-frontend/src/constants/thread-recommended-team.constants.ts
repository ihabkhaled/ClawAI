import { ThreadModelAvailability } from '@/enums/thread-model-availability.enum';

/** Same as the service cache, so the wizard never shows an older answer than the service holds. */
export const THREAD_RECOMMENDED_TEAM_STALE_MS = 60_000;

/**
 * Sentence key per reason a model cannot be used. Plain map, not a built string, so the key
 * reference test sees every key and a missing locale fails a test.
 */
export const THREAD_MODEL_UNAVAILABLE_REASON_KEYS: Readonly<
  Record<Exclude<ThreadModelAvailability, ThreadModelAvailability.Available>, string>
> = {
  [ThreadModelAvailability.NeedsPlan]: 'chat.threadTeam.reasonNeedsPlan',
  [ThreadModelAvailability.WindowTooSmall]: 'chat.threadTeam.reasonWindow',
  [ThreadModelAvailability.Unavailable]: 'chat.threadTeam.reasonUnavailable',
  [ThreadModelAvailability.Degraded]: 'chat.threadFixModelDegraded',
};

/** No availability known (the service could not be read): every model counts as available. */
export const THREAD_NO_AVAILABILITY: ReadonlyMap<string, ThreadModelAvailability> = new Map();
