// Fact tagging + deterministic serialization.
//
// Every extracted fact carries provenance and a confidence level so downstream
// consumers (audit narrative, knowledge manifests, context resolver) never
// silently assert something that was only inferred. "verified" means it was read
// directly from a canonical source; "unverified" means it was inferred by
// heuristic (e.g. a runtime relationship guessed from a name) and needs human
// confirmation before being treated as ground truth.

/** A directly-read fact. `source` is a repo-relative path or path#anchor. */
export function verified(value, source) {
  return { value, confidence: 'verified', source };
}

/** An inferred fact. `reason` explains why it could not be verified. */
export function unverified(value, source, reason) {
  return { value, confidence: 'unverified', source, reason };
}

/**
 * Stable, locale-independent string comparator (UTF-16 code-unit order). Used
 * for ALL sorting in the tooling instead of String.localeCompare, which is
 * locale-sensitive and would break the byte-identical-across-machines guarantee.
 */
export function cmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Comparator over a string field (or derived key) of objects. */
export function by(getKey) {
  return (a, b) => cmp(getKey(a), getKey(b));
}

/**
 * Normalize line endings to LF. Generated content is always computed with `\n`,
 * but a Windows checkout (core.autocrlf / `* text=auto`) may materialize the
 * on-disk file as CRLF. Freshness comparisons must normalize the on-disk side or
 * they false-fail on Windows after a fresh clone.
 */
export function normalizeEol(text) {
  return text.replace(/\r\n/g, '\n');
}

/** True when a tagged fact (or plain value) is unverified. */
export function isUnverified(fact) {
  return Boolean(fact) && typeof fact === 'object' && fact.confidence === 'unverified';
}

/**
 * Deterministic JSON stringify with recursively sorted object keys. Guarantees
 * byte-identical output for equal data regardless of insertion order — the
 * backbone of the repo's "unchanged source ⇒ identical generated output" rule.
 */
export function stableStringify(value) {
  return `${JSON.stringify(sortDeep(value), null, 2)}\n`;
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortDeep(value[key]);
    return out;
  }
  return value;
}

/**
 * FNV-1a 32-bit hash as an 8-char hex string. Stable, dependency-free content
 * hashing for the `hashes.json` freshness manifest and `knowledge:check`.
 */
export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
