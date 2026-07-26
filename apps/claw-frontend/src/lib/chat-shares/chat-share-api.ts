import { CHAT_SHARE_FETCH_TIMEOUT_MS } from '@/constants/chat-share-api.constants';

/**
 * Server-only base URL for chat-service.
 *
 * `CHAT_SERVICE_URL` is deliberately NOT prefixed `NEXT_PUBLIC_`: the public share
 * page is server-rendered precisely so that a crawler receives real conversation
 * text, which means the fetch happens here and the service origin never needs to
 * reach the browser bundle.
 *
 * Returns null when unset. The caller then treats the share as unavailable rather
 * than guessing an origin — a guessed origin in a misconfigured deployment is how
 * you end up fetching from somebody else's host.
 */
export function getChatServiceOrigin(): string | null {
  const raw = process.env['CHAT_SERVICE_URL'];
  if (raw === undefined || raw.trim() === '') {
    return null;
  }
  return raw.trim().replace(/\/$/u, '');
}

/**
 * Fetches JSON from chat-service with a hard timeout.
 *
 * The timeout matters more here than on a normal API call: this is on the render
 * path of an unauthenticated page, so a hanging upstream would hold a server
 * render open for every visitor. On timeout the caller renders `notFound()`, which
 * is the correct answer for "we cannot prove this share is public".
 *
 * `cache: 'no-store'` is not an optimisation choice — a revoked share must stop
 * resolving immediately, and a cached success would keep serving a conversation
 * the owner has taken back.
 */
export async function fetchChatServiceJson<T>(path: string): Promise<T | null> {
  const origin = getChatServiceOrigin();
  if (origin === null) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_SHARE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${origin}${path}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    // Deliberately opaque: a network error, a timeout, a 404, and a revoked share
    // must all look the same to the page, or the difference becomes an oracle for
    // probing which identifiers once existed.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
