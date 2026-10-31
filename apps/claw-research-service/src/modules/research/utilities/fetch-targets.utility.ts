import { hostLaneKey } from './fetch-batch.utility';

const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|ref_src$)/iu;

/**
 * One key per page: scheme, `www.`, fragment, tracking parameters, parameter
 * order and a trailing slash do not make a different page.
 */
export function canonicalUrlKey(raw: string): string {
  try {
    const url = new URL(raw);
    const kept = [...url.searchParams.entries()]
      .filter(([name]) => !TRACKING_PARAM.test(name))
      .sort(([a], [b]) => a.localeCompare(b));
    const query = kept.map(([k, v]) => `${k}=${v}`).join('&');
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/u, '') : '';
    const port = url.port === '' ? '' : `:${url.port}`;
    return `${hostLaneKey(raw)}${port}${path}${query === '' ? '' : `?${query}`}`.toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

/**
 * Picks up to `limit` hits in rank order: distinct canonical pages only, hosts
 * not yet used first, then the best remaining hits up to `perHostCap` per host.
 * The result keeps rank order, so the best-ranked page is still reported first.
 */
export function selectFetchTargets<T extends { url: string }>(
  ranked: readonly T[],
  limit: number,
  perHostCap: number,
): T[] {
  const seen = new Set<string>();
  const unique = ranked.filter((item) => {
    const key = canonicalUrlKey(item.url);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  const chosen = new Set<T>();
  const perHost = new Map<string, number>();
  const take = (item: T, cap: number): void => {
    const host = hostLaneKey(item.url);
    if (chosen.size >= limit || chosen.has(item) || (perHost.get(host) ?? 0) >= cap) {
      return;
    }
    chosen.add(item);
    perHost.set(host, (perHost.get(host) ?? 0) + 1);
  };
  for (const item of unique) {
    take(item, 1);
  }
  for (const item of unique) {
    take(item, perHostCap);
  }
  return unique.filter((item) => chosen.has(item));
}

/**
 * Splits `total` characters across pages: nobody gets more than they need,
 * the rest is shared equally, never below `floor`. Index 0 is the best-ranked
 * page and gets the rounding remainder.
 */
export function allocateCharBudget(
  needs: readonly number[],
  total: number,
  floor: number,
): number[] {
  const limits = new Map<number, number>(needs.map((_, index) => [index, floor]));
  let open = needs.map((_, index) => index);
  let remaining = Math.max(0, total);
  for (;;) {
    const share = open.length === 0 ? 0 : Math.floor(remaining / open.length);
    const small = open.filter((index) => (needs.at(index) ?? 0) <= share);
    if (small.length === 0) {
      break;
    }
    for (const index of small) {
      limits.set(index, Math.max(floor, needs.at(index) ?? 0));
      remaining -= needs.at(index) ?? 0;
    }
    open = open.filter((index) => !small.includes(index));
  }
  const share = open.length === 0 ? 0 : Math.floor(remaining / open.length);
  const extra = open.length === 0 ? 0 : remaining - share * open.length;
  for (const [position, index] of open.entries()) {
    limits.set(index, Math.max(floor, share + (position === 0 ? extra : 0)));
  }
  return needs.map((_, index) => limits.get(index) ?? floor);
}
