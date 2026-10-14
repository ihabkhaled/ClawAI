import {
  CITATION_ID_SPLIT_PATTERN,
  CITATION_MARKER_PATTERN,
  CITATION_NUMBER_MARKER_PATTERN,
  CITATION_ORDINAL_PATTERN,
} from '../constants/citation-markup.constants';
import type { ListedCitation } from '../types/healing.types';
import {
  canonicalCitationText,
  normalizeEvidenceUrl,
  resolveEvidenceId,
} from './citation-id.utility';

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

/**
 * A number a model used instead of an id ("1", "2"): kept only when the entry also gives the url of
 * the evidence item at that position, so a guess is never turned into a citation.
 */
function resolveOrdinal(
  raw: string,
  url: string | null,
  evidence: ReadonlyMap<string, string>,
): string | null {
  const digits = canonicalCitationText(raw);
  if (!CITATION_ORDINAL_PATTERN.test(digits) || url === null) return null;
  const entry = [...evidence][Number(digits) - 1];
  if (entry === undefined) return null;
  return normalizeEvidenceUrl(entry[1]) === normalizeEvidenceUrl(url) ? entry[0] : null;
}

/** The evidence id one listed citation names, or what it said when it names nothing in the bundle. */
function readListed(entry: unknown, evidence: ReadonlyMap<string, string>): ListedCitation {
  const raw = rawListedId(entry);
  const url = isRecord(entry) ? text(entry['url']) : null;
  const byId = raw === null ? null : resolveEvidenceId(raw, evidence);
  const byUrl = url === null ? null : resolveEvidenceId(url, evidence);
  const byOrdinal = raw === null || byId !== null ? null : resolveOrdinal(raw, url, evidence);
  const kept = raw === null ? '' : canonicalCitationText(raw);
  return {
    resolved: byId ?? byOrdinal ?? byUrl,
    kept: kept.length > 0 ? kept : null,
    ordinal: byOrdinal === null || raw === null ? null : canonicalCitationText(raw),
  };
}

/** The evidence ids one marker names, or null when any part of it is not an evidence id. */
function markerIds(
  body: string,
  evidence: ReadonlyMap<string, string>,
  aliases: ReadonlyMap<string, string>,
): string[] | null {
  const ids: string[] = [];
  for (const part of body.split(CITATION_ID_SPLIT_PATTERN)) {
    const id =
      resolveEvidenceId(part, evidence) ?? aliases.get(canonicalCitationText(part)) ?? null;
    if (id === null) return null;
    ids.push(id);
  }
  return ids;
}

/** Evidence ids named by `[id]`, `[id1, id2]` and `[[id]]` markers in the markdown. */
function citedIdsInMarkdown(
  markdown: string,
  evidence: ReadonlyMap<string, string>,
  aliases: ReadonlyMap<string, string>,
): string[] {
  const found = new Set<string>();
  for (const match of markdown.matchAll(CITATION_MARKER_PATTERN)) {
    for (const id of markerIds(match[1] ?? '', evidence, aliases) ?? []) found.add(id);
  }
  return [...found];
}

/**
 * Rewrites every marker that names evidence into the plain ASCII form `[id]` / `[id1, id2]`, so
 * a marker written with Arabic-Indic digits, full-width brackets or directional marks still
 * renders as a citation. A bracket that is not made of evidence ids (a link text) is left alone.
 */
function canonicalMarkers(
  markdown: string,
  evidence: ReadonlyMap<string, string>,
  aliases: ReadonlyMap<string, string>,
): string {
  const canonical = markdown.replaceAll(CITATION_MARKER_PATTERN, (marker, body: string) => {
    const ids = markerIds(body, evidence, aliases);
    return ids === null ? marker : `[${ids.join(', ')}]`;
  });
  if (aliases.size === 0) return canonical;
  // Short numbers are too short for the marker pattern above: they are rewritten only when the
  // draft's own list showed that it numbers its sources.
  return canonical.replaceAll(CITATION_NUMBER_MARKER_PATTERN, (marker, body: string) => {
    const ids = body.split(CITATION_ID_SPLIT_PATTERN).map((part) => aliases.get(part.trim()));
    return ids.length > 0 && ids.every((id) => id !== undefined) ? `[${ids.join(', ')}]` : marker;
  });
}

/**
 * Turns the citation shapes models legitimately answer with (bare id strings, `{id}` objects,
 * bracketed ids, ids mangled by right-to-left text or another digit set, a url instead of an id,
 * a url written with a trailing slash or tracking parameters, numbers that point at a listed url,
 * a missing url, no list at all) into `{ evidenceId, url }` pairs. The url always comes from the
 * evidence bundle for a known id. A listed entry that names nothing in the bundle is dropped when
 * the draft cites at least one real item (the draft is still grounded; the dropped entry added
 * nothing); when nothing resolves the unknown ids are kept so the evidence rule refuses the draft
 * and the retry says why. Anything that is not an object is returned unchanged.
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
  const listed = (Array.isArray(value['citations']) ? value['citations'] : []).map((entry) =>
    readListed(entry, evidence),
  );
  const aliases = new Map(
    listed.flatMap(({ ordinal, resolved }) =>
      ordinal !== null && resolved !== null ? [[ordinal, resolved] as const] : [],
    ),
  );
  const markdown = canonicalMarkers(body, evidence, aliases);
  // The list is authoritative when any entry in it resolves; the markers only stand in for a list
  // that names nothing usable.
  const listedIds = listed.flatMap(({ resolved }) => (resolved === null ? [] : [resolved]));
  const resolvedIds =
    listedIds.length > 0 ? listedIds : citedIdsInMarkdown(markdown, evidence, aliases);
  const unresolved = listed.flatMap(({ resolved, kept }) =>
    resolved === null && kept !== null ? [kept] : [],
  );
  const evidenceIds = [...new Set(resolvedIds.length > 0 ? resolvedIds : unresolved)];
  return {
    markdown,
    citations: evidenceIds.map((evidenceId) => ({
      evidenceId,
      url: evidence.get(evidenceId) ?? evidenceId,
    })),
  };
}
