import {
  RESEARCH_BLOCKER_QUERIES_MAX,
  RESEARCH_GAP_HINT_QUERIES_MAX,
  RESEARCH_GAP_SUBJECT_TERMS,
  RESEARCH_KEYWORDS_MAX,
  RESEARCH_QUERIES_MAX,
  RESEARCH_SHORT_TOPIC_CHARS,
} from '../constants/research-queries.constants';
import { extractRepositories, extractSourceHints } from './research-hints.utility';
import { clampQuery, significantWords, topicSubject } from './research-text.utility';

function repositoryQueries(topic: string): string[] {
  return extractRepositories(topic).map((name) => `https://github.com/${name}`);
}

function uniqueQueries(candidates: readonly string[]): string[] {
  const seen = new Set<string>();
  const queries: string[] = [];
  for (const candidate of candidates) {
    const query = clampQuery(candidate);
    const key = query.toLowerCase();
    if (query.length === 0 || seen.has(key)) continue;
    seen.add(key);
    queries.push(query);
  }
  return queries.slice(0, RESEARCH_QUERIES_MAX);
}

/**
 * The queries of the first research pass (ADR-195). A short topic with no source hint is one
 * query, as before. Otherwise: one query per source the topic names (arXiv id, DOI, quoted title,
 * author and year), one for a repository it names, the subject sentence, and the key terms. At
 * most six, each at most 160 characters, no repeats.
 */
export function buildResearchQueries(topic: string): string[] {
  const flat = topic.trim();
  const hints = extractSourceHints(flat);
  const repositories = repositoryQueries(flat);
  if ([...flat].length <= RESEARCH_SHORT_TOPIC_CHARS && hints.length === 0) {
    return uniqueQueries([...repositories, flat]);
  }
  const keywords = significantWords(flat, RESEARCH_KEYWORDS_MAX).join(' ');
  return uniqueQueries([...hints, ...repositories, topicSubject(flat), keywords]);
}

/** The key terms of one blocker with the topic's subject in front, so a bare "cite sources" is still a search. */
function blockerQuery(subject: string, blocker: string): string {
  const terms = significantWords(blocker, RESEARCH_KEYWORDS_MAX, true);
  return terms.length === 0 ? '' : `${subject} ${terms.join(' ')}`.trim();
}

/**
 * The queries of the evidence-gap pass: the hints of the whole topic first (the missing source is
 * often one the topic named), one query per evidence-gap blocker (its key terms after the topic's
 * subject), then the subject. A blocker that names an arXiv id or a DOI contributes that hint.
 */
export function buildEvidenceGapQueries(topic: string, blockers: readonly string[]): string[] {
  const flat = topic.trim();
  const subject = significantWords(topicSubject(flat), RESEARCH_GAP_SUBJECT_TERMS).join(' ');
  const fromBlockers = blockers
    .slice(0, RESEARCH_BLOCKER_QUERIES_MAX)
    .flatMap((blocker) => [...extractSourceHints(blocker), blockerQuery(subject, blocker)]);
  return uniqueQueries([
    ...extractSourceHints(flat).slice(0, RESEARCH_GAP_HINT_QUERIES_MAX),
    ...repositoryQueries(flat),
    ...fromBlockers,
    topicSubject(flat),
  ]);
}
