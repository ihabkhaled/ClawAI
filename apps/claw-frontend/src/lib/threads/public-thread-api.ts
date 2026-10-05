import {
  THREAD_PUBLIC_API_PATH,
  THREAD_PUBLIC_FETCH_TIMEOUT_MS,
  THREAD_PUBLIC_SITEMAP_PAGE_SIZE,
} from '@/constants/thread-public-api.constants';
import type { PublicThreadPublication } from '@/types/thread-publication.types';

export function getThreadsServiceOrigin(): string | null {
  const raw = process.env['THREADS_SERVICE_URL'];
  return raw?.trim() ? raw.trim().replace(/\/$/u, '') : null;
}

export async function getPublicThreadPublication(
  slug: string,
): Promise<PublicThreadPublication | null> {
  if (!/^[a-zA-Z0-9-]{1,64}$/u.test(slug)) {return null;}
  const origin = getThreadsServiceOrigin();
  if (origin === null) {return null;}
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), THREAD_PUBLIC_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${origin}${THREAD_PUBLIC_API_PATH}/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    return response.ok ? ((await response.json()) as PublicThreadPublication) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function countPublicThreads(locale: string): Promise<number> {
  const origin = getThreadsServiceOrigin();
  if (origin === null) {return 0;}
  const query = new URLSearchParams({ locale });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), THREAD_PUBLIC_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${origin}${THREAD_PUBLIC_API_PATH}/sitemap?${query}&page=0&limit=1`,
      {
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      },
    );
    if (!response.ok) {return 0;}
    const result = (await response.json()) as { total?: unknown };
    return typeof result.total === 'number' && Number.isSafeInteger(result.total)
      ? result.total
      : 0;
  } catch {
    return 0;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getPublicThreadSitemapPage(locale: string, page: number) {
  const origin = getThreadsServiceOrigin();
  if (origin === null) {return null;}
  const query = new URLSearchParams({
    locale,
    page: String(page),
    limit: String(THREAD_PUBLIC_SITEMAP_PAGE_SIZE),
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), THREAD_PUBLIC_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${origin}${THREAD_PUBLIC_API_PATH}/sitemap?${query}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {return null;}
    return (await response.json()) as {
      total: number;
      items: Array<{ slug: string; publishedAt: string }>;
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function listPublicThreadFeedEntries(locale: string) {
  const origin = getThreadsServiceOrigin();
  if (origin === null) {return null;}
  const query = new URLSearchParams({ locale, limit: '100' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), THREAD_PUBLIC_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${origin}${THREAD_PUBLIC_API_PATH}/discover?${query}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {return null;}
    const result = (await response.json()) as {
      items?: Array<{
        slug: string;
        title: string;
        excerpt: string;
        contentLocale: string;
        publishedAt: string;
      }>;
    };
    return Array.isArray(result.items) ? result.items : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function listPublicThreadDiscoveries(locale: string) {
  const origin = getThreadsServiceOrigin();
  if (origin === null) {return [];}
  const query = new URLSearchParams({ locale, limit: '20' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), THREAD_PUBLIC_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${origin}${THREAD_PUBLIC_API_PATH}/discover?${query}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {return [];}
    const result = (await response.json()) as {
      items?: Array<{
        slug: string;
        title: string;
        excerpt: string;
        contentLocale: string;
        publishedAt: string;
      }>;
    };
    return Array.isArray(result.items) ? result.items : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
