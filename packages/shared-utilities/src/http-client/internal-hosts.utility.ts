import { INTERNAL_HOST_ENV_SUFFIXES } from './request-url.constants';

/**
 * The hosts this process is configured to call.
 *
 * `httpRequest` hands its URL straight to `fetch`, which is the shape of a
 * server-side request forgery (CodeQL js/request-forgery, alert #58): anything
 * that can steer that string steers where the server connects. Every caller
 * builds its URL from a configured base — `AUTH_SERVICE_URL`,
 * `CONNECTOR_SERVICE_URL`, `OLLAMA_BASE_URL` and their siblings — so the set of
 * legitimate destinations is already written down in the environment, per
 * deployment, without a list in this package that would go stale.
 *
 * Computed once. A service that has none of these variables (a unit test, a
 * tool) gets an empty set, and the check stands down rather than refusing
 * everything: this is a guard on where configured calls may go, not an
 * authentication.
 */
let cached: ReadonlySet<string> | null = null;

function hostFrom(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.host : null;
  } catch {
    return null;
  }
}

export function internalHostAllowlist(env: NodeJS.ProcessEnv = process.env): ReadonlySet<string> {
  if (cached && env === process.env) {
    return cached;
  }
  const hosts = new Set<string>();
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined || value === '') {
      continue;
    }
    if (!INTERNAL_HOST_ENV_SUFFIXES.some((suffix) => name.endsWith(suffix))) {
      continue;
    }
    const host = hostFrom(value);
    if (host !== null) {
      hosts.add(host);
    }
  }
  if (env === process.env) {
    cached = hosts;
  }
  return hosts;
}

/** Test seam: forget the computed set so a changed environment is re-read. */
export function resetInternalHostAllowlist(): void {
  cached = null;
}
