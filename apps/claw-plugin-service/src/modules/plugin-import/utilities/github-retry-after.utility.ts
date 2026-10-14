import {
  GITHUB_RETRY_FALLBACK_SECONDS,
  GITHUB_RETRY_MAX_SECONDS,
  MS_PER_SECOND,
} from '../constants/plugin-import.constants';

/** Seconds until GitHub allows another call: `Retry-After`, else the rate-limit reset time, else a default. */
export function retryAfterSeconds(headers: Record<string, string>): number {
  const retryAfter = Number(headers['retry-after']);
  const reset = Number(headers['x-ratelimit-reset']);
  let seconds = GITHUB_RETRY_FALLBACK_SECONDS;
  if (Number.isFinite(retryAfter) && retryAfter > 0) seconds = retryAfter;
  else if (Number.isFinite(reset) && reset > 0) {
    seconds = Math.ceil(reset - Date.now() / MS_PER_SECOND);
  }
  return Math.min(Math.max(seconds, 1), GITHUB_RETRY_MAX_SECONDS);
}
