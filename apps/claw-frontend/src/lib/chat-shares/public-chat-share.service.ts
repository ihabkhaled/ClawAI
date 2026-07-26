import {
  CHAT_SHARE_SITEMAP_FEED_PATH,
  CHAT_SHARE_SITEMAP_MAX_ENTRIES,
  CHAT_SHARE_SITEMAP_PAGE_SIZE,
  PUBLIC_CHAT_SHARE_API_PATH,
} from '@/constants/chat-share-api.constants';
import { PUBLIC_SHARE_ID_PATTERN } from '@/constants/public-share-id.constants';
import { fetchChatServiceJson } from '@/lib/chat-shares/chat-share-api';
import type { PublicChatShare, PublicChatSitemapEntry } from '@/types/chat-share.types';

/**
 * Whether an identifier is even shaped like one we could have issued.
 *
 * Rejecting malformed identifiers before the network call is the cheap half of
 * enumeration defence: a crawler walking `/share/chat/1`, `/share/chat/2`, … never
 * reaches chat-service at all, so the rate limit there is spent only on plausible
 * guesses.
 */
export function isWellFormedPublicShareId(value: string): boolean {
  return PUBLIC_SHARE_ID_PATTERN.test(value);
}

/**
 * Fetches one public snapshot, or null when it is not available.
 *
 * "Not available" is deliberately one answer covering private, revoked, deleted,
 * never-existed, backend-down, and timed-out. The page renders the same 404 for
 * all of them, so the response cannot be used to learn whether an identifier was
 * ever valid.
 */
export async function getPublicChatShare(publicShareId: string): Promise<PublicChatShare | null> {
  if (!isWellFormedPublicShareId(publicShareId)) {
    return null;
  }
  return fetchChatServiceJson<PublicChatShare>(
    `${PUBLIC_CHAT_SHARE_API_PATH}/${encodeURIComponent(publicShareId)}`,
  );
}

/**
 * Pages through the sitemap feed and returns every indexable share.
 *
 * Paginated rather than fetched whole because a sitemap for a large deployment
 * would otherwise mean loading every public share into memory during a render. The
 * loop stops on the first empty or short page, on a failed request, and at
 * `CHAT_SHARE_SITEMAP_MAX_ENTRIES` — so a backend that keeps returning full pages
 * cannot spin here forever.
 *
 * Returns whatever it collected on failure rather than throwing. A sitemap missing
 * its dynamic half is a degraded sitemap; a sitemap that 500s is no sitemap at all,
 * and would take the static pages down with it.
 */
export async function listIndexableChatShares(): Promise<PublicChatSitemapEntry[]> {
  const collected: PublicChatSitemapEntry[] = [];
  let cursor: string | null = null;

  while (collected.length < CHAT_SHARE_SITEMAP_MAX_ENTRIES) {
    const query = new URLSearchParams({ limit: String(CHAT_SHARE_SITEMAP_PAGE_SIZE) });
    if (cursor !== null) {
      query.set('cursor', cursor);
    }
    const page = await fetchChatServiceJson<PublicChatSitemapEntry[]>(
      `${CHAT_SHARE_SITEMAP_FEED_PATH}?${query.toString()}`,
    );
    if (page === null || page.length === 0) {
      break;
    }
    collected.push(...page);
    if (page.length < CHAT_SHARE_SITEMAP_PAGE_SIZE) {
      break;
    }
    cursor = page.at(-1)?.publicShareId ?? null;
    if (cursor === null) {
      break;
    }
  }

  return collected.slice(0, CHAT_SHARE_SITEMAP_MAX_ENTRIES);
}
