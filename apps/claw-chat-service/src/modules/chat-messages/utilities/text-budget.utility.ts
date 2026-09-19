import { TEXT_BUDGET_MIN_ITEM_CHARS } from '../constants/evidence-fit.constants';
import type { TextBudgetResult } from '../types/evidence-fit.types';

/**
 * Fits a ranked list of texts into a character budget.
 *
 * Same order of preference as the research fit: keep everything; else shorten
 * every text evenly; else keep the first texts at a minimum useful length and
 * drop the rest. The caller's order is its ranking, so the tail goes first.
 */
export function fitTextsToBudget(texts: readonly string[], maxChars: number): TextBudgetResult {
  const total = texts.reduce((sum, text) => sum + text.length, 0);
  if (total <= maxChars || texts.length === 0) {
    return { texts: [...texts], dropped: 0 };
  }
  const evenShare = Math.floor(maxChars / texts.length);
  if (evenShare >= TEXT_BUDGET_MIN_ITEM_CHARS) {
    return { texts: texts.map((text) => shorten(text, evenShare)), dropped: 0 };
  }
  const kept: string[] = [];
  let used = 0;
  for (const text of texts) {
    const next = Math.min(text.length, TEXT_BUDGET_MIN_ITEM_CHARS);
    if (used + next > maxChars) {
      break;
    }
    kept.push(shorten(text, TEXT_BUDGET_MIN_ITEM_CHARS));
    used += next;
  }
  return { texts: kept, dropped: texts.length - kept.length };
}

function shorten(text: string, maxChars: number): string {
  return text.length <= maxChars
    ? text
    : `${text.slice(0, maxChars)}\n[...shortened to fit the model's context window...]`;
}
