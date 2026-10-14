import {
  CITATION_ID_SPLIT_PATTERN,
  CITATION_MARKER_PATTERN,
} from '../constants/citation-markup.constants';
import { canonicalCitationText, resolveEvidenceId } from './citation-id.utility';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** The id text of one listed citation: a bare string, or the `evidenceId` / `id` of an object. */
function rawListedId(entry: unknown): string | null {
  return isRecord(entry) ? (text(entry['evidenceId']) ?? text(entry['id'])) : text(entry);
}

/** The evidence id one listed citation names, as written when it names nothing in the bundle. */
function listedId(entry: unknown, evidence: ReadonlyMap<string, string>): string | null {
  const raw = rawListedId(entry);
  const url = isRecord(entry) ? text(entry['url']) : null;
  const resolved =
    (raw === null ? null : resolveEvidenceId(raw, evidence)) ??
    (url === null ? null : resolveEvidenceId(url, evidence));
  if (resolved !== null) return resolved;
  const kept = raw === null ? '' : canonicalCitationText(raw);
  return kept.length > 0 ? kept : null;
}

/** The evidence ids one marker names, or null when any part of it is not an evidence id. */
function markerIds(body: string, evidence: ReadonlyMap<string, string>): string[] | null {
  const ids: string[] = [];
  for (const part of body.split(CITATION_ID_SPLIT_PATTERN)) {
    const id = resolveEvidenceId(part, evidence);
    if (id === null) return null;
    ids.push(id);
  }
  return ids;
}

/** Evidence ids named by `[id]`, `[id1, id2]` and `[[id]]` markers in the markdown. */
function citedIdsInMarkdown(markdown: string, evidence: ReadonlyMap<string, string>): string[] {
  const found = new Set<string>();
  for (const match of markdown.matchAll(CITATION_MARKER_PATTERN)) {
    for (const part of (match[1] ?? '').split(CITATION_ID_SPLIT_PATTERN)) {
      const id = resolveEvidenceId(part, evidence);
      if (id !== null) found.add(id);
    }
  }
  return [...found];
}

/**
 * Rewrites every marker that names evidence into the plain ASCII form `[id]` / `[id1, id2]`, so
 * a marker written with Arabic-Indic digits, full-width brackets or directional marks still
 * renders as a citation. A bracket that is not made of evidence ids (a link text) is left alone.
 */
function canonicalMarkers(markdown: string, evidence: ReadonlyMap<string, string>): string {
  return markdown.replaceAll(CITATION_MARKER_PATTERN, (marker, body: string) => {
    const ids = markerIds(body, evidence);
    return ids === null ? marker : `[${ids.join(', ')}]`;
  });
}

/**
 * Turns the citation shapes models legitimately answer with (bare id strings, `{id}` objects,
 * bracketed ids, ids mangled by right-to-left text or another digit set, a missing url, no list at
 * all) into `{ evidenceId, url }` pairs. The url always comes from the evidence bundle for a known
 * id; an unknown id is kept as given so the schema's evidence rule still rejects it. Anything that
 * is not an object is returned unchanged.
 */
export function normalizeAuthorOutput(
  value: unknown,
  evidence: ReadonlyMap<string, string>,
): unknown {
  if (!isRecord(value)) return value;
  const body = [value['markdown'], value['content'], value['text'], value['body']].find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0,
  );
  if (body === undefined) return value;
  const markdown = canonicalMarkers(body, evidence);
  const listed = Array.isArray(value['citations']) ? value['citations'] : [];
  const ids = listed.flatMap((entry) => {
    const id = listedId(entry, evidence);
    return id === null ? [] : [id];
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
