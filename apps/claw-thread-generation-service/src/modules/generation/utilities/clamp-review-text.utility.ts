import { REVIEW_TEXT_MAX_CHARS } from '../constants/review-prompt.constants';

/** Trims and shortens by code points, so a surrogate pair is never cut in half. */
export function clampReviewText(text: string, max: number = REVIEW_TEXT_MAX_CHARS): string {
  const trimmed = text.trim();
  const points = [...trimmed];
  return points.length <= max ? trimmed : `${points.slice(0, max - 1).join('')}\u2026`;
}

/** Drops blank entries, shortens the rest and keeps at most `limit`. */
export function clampReviewList(items: readonly string[], limit: number): string[] {
  return items
    .map((item) => clampReviewText(item))
    .filter((item) => item.length > 0)
    .slice(0, limit);
}
