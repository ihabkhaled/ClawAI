import {
  MIN_MATCH_TOKEN_LENGTH,
  PLANTED_IDENTIFIER_PATTERN,
} from '../constants/context-composer.constants';
import { SALIENT_TERM_LIMIT, SALIENT_TERM_STOPWORDS } from '../constants/salient-terms.constants';
import { type SalientTerms } from '../types/salient-terms.types';

/**
 * The words worth searching a user's whole history for.
 *
 * Cross-thread retrieval cannot score every message a user has ever written —
 * it has to ask the database a question first, and this is that question. The
 * ordering is the important part: a coined identifier (`MERIDIAN-88`) is worth
 * far more as a search term than a common word, because it is the thing that
 * makes one previous conversation the RIGHT one rather than a topically similar
 * one. Identifiers come first and are never crowded out.
 *
 * Stopwords here are conversational filler, not domain vocabulary. Removing
 * "project" would be wrong — plenty of threads are about a project and the word
 * genuinely narrows the search. Removing "continue" is right: it says something
 * about the sentence, nothing about the subject.
 */
export function extractSalientTerms(intent: string): SalientTerms {
  const identifiers = [...intent.matchAll(PLANTED_IDENTIFIER_PATTERN)].map((match) => match[0]);

  const words = intent
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]+/g, ' ')
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= MIN_MATCH_TOKEN_LENGTH &&
        !(SALIENT_TERM_STOPWORDS as ReadonlySet<string>).has(token),
    )
    // Longer words are more discriminating than shorter ones at equal frequency.
    .sort((a, b) => b.length - a.length);

  return {
    identifiers: dedupe(identifiers),
    words: dedupe(words),
  };
}

function dedupe(terms: readonly string[]): string[] {
  const out: string[] = [];
  for (const term of terms) {
    if (out.some((existing) => existing.toLowerCase() === term.toLowerCase())) continue;
    out.push(term);
    if (out.length >= SALIENT_TERM_LIMIT) break;
  }
  return out;
}

/**
 * Which terms a cross-thread search should actually use.
 *
 * Identifiers win outright when present, and that is the precision gate for the
 * whole feature. "Continue the MERIDIAN-88 project" searched on
 * `[MERIDIAN-88, project, package, manager]` matches every thread that ever
 * mentioned a package manager; searched on `[MERIDIAN-88]` it matches the one
 * conversation the user means. Falling back to words only when there is no
 * identifier keeps the feature useful for ordinary prompts without letting
 * those prompts drag in half the account.
 */
export function searchTermsFor(terms: SalientTerms): string[] {
  return terms.identifiers.length > 0 ? terms.identifiers : terms.words;
}
