import { CRAWL_RANK_MIN_TERM_LENGTH } from '../../../common/constants/crawl.constants';

/** A host compared without a leading `www.`, lower-cased. */
export function stripWww(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./u, '');
}

/**
 * Pages whose URL shares words with the question first; discovery order
 * otherwise. Stable, so with no overlap at all the sitemap order is kept.
 *
 * Sitemaps list pages in document order, so on a large site the page a
 * question was about ("the pricing page") used to fall outside the page budget
 * and the answer came from the blog index instead.
 */
export function rankCandidatesByIntent<T extends { url: string }>(
  candidates: T[],
  intent: string,
): T[] {
  const terms = intent
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((term) => term.length >= CRAWL_RANK_MIN_TERM_LENGTH);
  if (terms.length === 0) {
    return candidates;
  }
  const score = (url: string): number => {
    const path = url.toLowerCase();
    return terms.reduce((total, term) => (path.includes(term) ? total + 1 : total), 0);
  };
  return candidates
    .map((candidate, index) => ({ candidate, index, score: score(candidate.url) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.candidate);
}
