/** Lower-cased word tokens (letters and digits in any script). */
export function wordTokens(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

/** Jaccard similarity of the two texts' token sets, 0..1 (two empty texts are identical). */
export function tokenSetJaccard(left: string, right: string): number {
  const a = wordTokens(left);
  const b = wordTokens(right);
  if (a.size === 0 && b.size === 0) return 1;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}
