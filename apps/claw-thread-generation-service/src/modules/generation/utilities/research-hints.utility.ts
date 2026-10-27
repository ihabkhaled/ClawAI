import {
  ARXIV_ID_PATTERN,
  AUTHOR_LOOKBACK_CHARS,
  AUTHOR_NAME_WORDS_MAX,
  CLOSING_BRACKETS,
  DOI_PATTERN,
  ET_AL_MARKERS,
  GITHUB_URL_PATTERN,
  OPEN_BRACKETS,
  QUOTED_TITLE_MAX_CHARS,
  QUOTED_TITLE_MIN_CHARS,
  QUOTED_TITLE_PATTERN,
  REPOSITORY_NAME_PATTERN,
  RESEARCH_HINT_QUERIES_MAX,
  RESEARCH_HINT_TRAIL_CHARS,
  RESEARCH_HINT_WINDOW_CHARS,
  SEGMENT_SPLIT_PATTERN,
  TRAILING_DOI_CHARS,
  TRAILING_REPOSITORY_CHARS,
  UPPER_LATIN_WORD_PATTERN,
  YEAR_PATTERN,
} from '../constants/research-queries.constants';
import { clampQuery } from './research-text.utility';

function trimEnd(text: string, chars: string): string {
  let end = text.length;
  while (end > 0 && chars.includes(text.charAt(end - 1))) end -= 1;
  return text.slice(0, end);
}

/**
 * The words that describe an identifier: the window of the segment that ends at it, starting after
 * the last colon in the window (a label such as "search hints:" describes nothing) and at a word.
 */
function describedBy(segment: string, identifierEnd: number): string {
  const matchEnd = CLOSING_BRACKETS.includes(segment.charAt(identifierEnd))
    ? identifierEnd + 1
    : identifierEnd;
  const from = Math.max(0, matchEnd - RESEARCH_HINT_WINDOW_CHARS);
  let window = segment.slice(from, matchEnd);
  const colon = Math.max(window.lastIndexOf(':'), window.lastIndexOf('：'));
  if (colon >= 0 && window.length - colon > 12) window = window.slice(colon + 1);
  else if (from > 0) window = window.slice(window.indexOf(' ') + 1);
  return window.trim();
}

function identifierQueries(segment: string): string[] {
  const found: string[] = [];
  for (const match of segment.matchAll(ARXIV_ID_PATTERN)) {
    found.push(describedBy(segment, (match.index ?? 0) + match[0].length));
  }
  for (const match of segment.matchAll(DOI_PATTERN)) {
    const doi = trimEnd(match[0], TRAILING_DOI_CHARS);
    found.push(describedBy(segment, (match.index ?? 0) + doi.length));
  }
  return found;
}

/** Words of a text, lower case, dots as spaces, so "et al." and "u. a." compare as words. */
function wordsOf(text: string): string {
  return text.toLowerCase().replaceAll('.', ' ').split(/\s+/u).filter(Boolean).join(' ');
}

function hasEtAlMarker(text: string): boolean {
  const padded = ` ${wordsOf(text)} `;
  return ET_AL_MARKERS.some((marker) => padded.includes(` ${wordsOf(marker)} `));
}

/** The author words that stand before a year: back to the start of the sentence, at most four. */
function nameBefore(before: string): string {
  const words = before.trim().split(/\s+/u).filter(Boolean);
  const name: string[] = [];
  for (const word of words.reverse()) {
    const endsSentence = word.endsWith('.') && !hasEtAlMarker(word) && name.length > 0;
    if (endsSentence || name.length >= AUTHOR_NAME_WORDS_MAX) break;
    name.unshift(word);
  }
  return trimEnd(name.join(' '), OPEN_BRACKETS).trim();
}

/**
 * "Sharma et al. 2023" and "Amodei (2016)" name a work; "Since 2020" is prose. A year counts when
 * the words before it end with "et al." (or its equivalent in another language) or are a Latin
 * name followed by a year in brackets. The query is the name, the year and what follows.
 */
function authorYearQueries(segment: string): string[] {
  const found: string[] = [];
  for (const match of segment.matchAll(YEAR_PATTERN)) {
    const at = match.index ?? 0;
    const before = segment.slice(Math.max(0, at - AUTHOR_LOOKBACK_CHARS), at);
    const bracketed = OPEN_BRACKETS.includes(before.trimEnd().slice(-1));
    const name = nameBefore(before);
    const named = hasEtAlMarker(name) || (bracketed && UPPER_LATIN_WORD_PATTERN.test(name));
    if (!named || name.length === 0) continue;
    const afterYear = at + match[0].length;
    const trail = segment.slice(afterYear, afterYear + RESEARCH_HINT_TRAIL_CHARS);
    found.push(
      `${name} ${bracketed ? `(${match[0]})` : match[0]} ${trimEnd(trail, ')）]')}`.trim(),
    );
  }
  return found;
}

function quotedTitles(segment: string): string[] {
  return [...segment.matchAll(QUOTED_TITLE_PATTERN)]
    .map((match) => match[1] ?? '')
    .filter(
      (title) => title.length >= QUOTED_TITLE_MIN_CHARS && title.length <= QUOTED_TITLE_MAX_CHARS,
    );
}

/**
 * Short queries for the sources a topic names: an arXiv id or a DOI with the words that describe
 * it, a quoted title, or "Author et al. YEAR" with what the work was about. Each query comes from
 * the segment (sentence part between `;` or line breaks) that holds the hint, so the hint is
 * found wherever it sits in a long topic, in any language. A segment with an identifier is not
 * searched a second time for an author and year.
 */
export function extractSourceHints(topic: string): string[] {
  const queries: string[] = [];
  for (const segment of topic.split(SEGMENT_SPLIT_PATTERN)) {
    const byId = identifierQueries(segment);
    const rest = byId.length > 0 ? [] : [...quotedTitles(segment), ...authorYearQueries(segment)];
    queries.push(...byId, ...rest);
  }
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of queries) {
    const query = clampQuery(raw);
    const key = query.toLowerCase();
    if (query.length < 6 || seen.has(key)) continue;
    seen.add(key);
    unique.push(query);
  }
  return unique.slice(0, RESEARCH_HINT_QUERIES_MAX);
}

/** The GitHub repositories a topic names, as `owner/repo`, by github.com url or "repository owner/repo". */
export function extractRepositories(topic: string): string[] {
  const names = new Set<string>();
  const add = (owner: string, repo: string): void => {
    const bare = repo.endsWith('.git') ? repo.slice(0, -'.git'.length) : repo;
    const name = trimEnd(bare, TRAILING_REPOSITORY_CHARS);
    if (owner.length > 0 && name.length > 0) names.add(`${owner}/${name}`);
  };
  for (const match of topic.matchAll(GITHUB_URL_PATTERN)) add(match[1] ?? '', match[2] ?? '');
  for (const match of topic.matchAll(REPOSITORY_NAME_PATTERN)) {
    const [owner = '', repo = ''] = (match[1] ?? '').split('/');
    add(owner, repo);
  }
  return [...names];
}
