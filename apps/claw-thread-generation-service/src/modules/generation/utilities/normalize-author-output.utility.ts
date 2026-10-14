import {
  CITATION_ID_SPLIT_PATTERN,
  CITATION_MARKER_PATTERN,
} from '../constants/generation.constants';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bareId(raw: string): string {
  return raw.replaceAll(/^[\s[]+|[\s\]]+$/gu, '');
}

function citationId(entry: unknown): string | null {
  if (typeof entry === 'string') return bareId(entry);
  if (!isRecord(entry)) return null;
  const id = entry['evidenceId'] ?? entry['id'];
  return typeof id === 'string' ? bareId(id) : null;
}

/** Evidence ids named by `[id]`, `[id1, id2]` and `[[id]]` markers in the markdown. */
function citedIdsInMarkdown(markdown: string, evidence: ReadonlyMap<string, string>): string[] {
  const found = new Set<string>();
  for (const match of markdown.matchAll(CITATION_MARKER_PATTERN)) {
    for (const part of (match[1] ?? '').split(CITATION_ID_SPLIT_PATTERN)) {
      const id = bareId(part);
      if (evidence.has(id)) found.add(id);
    }
  }
  return [...found];
}

/**
 * Turns the citation shapes models legitimately answer with (bare id strings, `{id}` objects,
 * bracketed ids, a missing url, no list at all) into `{ evidenceId, url }` pairs. The url always
 * comes from the evidence bundle for a known id; an unknown id is kept as given so the schema's
 * evidence rule still rejects it. Anything that is not an object is returned unchanged.
 */
export function normalizeAuthorOutput(
  value: unknown,
  evidence: ReadonlyMap<string, string>,
): unknown {
  if (!isRecord(value)) return value;
  const markdown = [value['markdown'], value['content'], value['text'], value['body']].find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0,
  );
  if (markdown === undefined) return value;
  const listed = Array.isArray(value['citations']) ? value['citations'] : [];
  const ids = listed.flatMap((entry) => {
    const id = citationId(entry);
    return id ? [id] : [];
  });
  const evidenceIds = [...new Set(ids.length > 0 ? ids : citedIdsInMarkdown(markdown, evidence))];
  return {
    markdown,
    citations: evidenceIds.map((evidenceId) => ({
      evidenceId,
      url: evidence.get(evidenceId) ?? evidenceId,
    })),
  };
}
