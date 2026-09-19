import {
  EVIDENCE_FIT_MIN_SNIPPET_CHARS,
  EVIDENCE_FIT_PER_ITEM_OVERHEAD_CHARS,
} from '../constants/evidence-fit.constants';
import type { EvidenceFitResult, FittableEvidence } from '../types/evidence-fit.types';

/**
 * Fits research evidence into the character budget the answering model has.
 *
 * The research block used to go into the prompt whole. That was harmless at
 * twenty items and wrong at two hundred: a 200-page crawl is ~300k characters,
 * which overflows most models, and even six items once overflowed a small one
 * ("the model stopped because the context window was full").
 *
 * In order of preference: keep everything; else shorten every snippet evenly;
 * else keep the highest-ranked items at a minimum useful length and drop the
 * rest, reporting how many were dropped so the prompt can SAY so (rule 41 -
 * never silently present less than was read). Items arrive ranked, the page the
 * user named first, so dropping from the end drops the least relevant.
 */
export function fitEvidenceToBudget<T extends FittableEvidence>(
  items: readonly T[],
  maxChars: number,
): EvidenceFitResult<T> {
  const cost = (item: T, snippetChars: number): number =>
    EVIDENCE_FIT_PER_ITEM_OVERHEAD_CHARS +
    (item.title?.length ?? 0) +
    item.url.length +
    Math.min(item.snippet.length, snippetChars);

  const full = items.reduce((total, item) => total + cost(item, item.snippet.length), 0);
  if (full <= maxChars || items.length === 0) {
    return { items: [...items], omitted: 0 };
  }

  const headers = items.reduce((total, item) => total + cost(item, 0), 0);
  const evenShare = Math.floor((maxChars - headers) / items.length);
  if (evenShare >= EVIDENCE_FIT_MIN_SNIPPET_CHARS) {
    return { items: items.map((item) => shorten(item, evenShare)), omitted: 0 };
  }

  const kept: T[] = [];
  let used = 0;
  for (const item of items) {
    const next = cost(item, EVIDENCE_FIT_MIN_SNIPPET_CHARS);
    if (used + next > maxChars) {
      break;
    }
    kept.push(shorten(item, EVIDENCE_FIT_MIN_SNIPPET_CHARS));
    used += next;
  }
  return { items: kept, omitted: items.length - kept.length };
}

function shorten<T extends FittableEvidence>(item: T, maxSnippetChars: number): T {
  return item.snippet.length <= maxSnippetChars
    ? item
    : { ...item, snippet: `${item.snippet.slice(0, maxSnippetChars)}…` };
}
