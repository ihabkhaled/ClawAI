import {
  DECISION_MARKER_PATTERN,
  MIN_MATCH_TOKEN_LENGTH,
  NUMERIC_TOKEN_PATTERN,
  PLANTED_IDENTIFIER_PATTERN,
  RELEVANCE_WEIGHTS,
} from '../constants/context-composer.constants';
import { type ConversationTurn } from '../types/context-composer.types';

/**
 * Hybrid relevance for an older turn against the current prompt.
 *
 * Four signals, because the previous single signal — Jaccard-ish overlap of
 * words four characters or longer — is the weakest of the four and was being
 * used alone, as a hard gate, at a 0.45 threshold. Measured live against a
 * planted fact at a fixed distance, that gate recalled the fact when the
 * question happened to reuse four of the seeding sentence's words and failed
 * when it did not. Same fact, same thread, same model, different phrasing.
 *
 * Here the score never gates anything by itself. It orders P2 candidates, and
 * the token budget decides how many of them fit.
 */
export function scoreTurnRelevance(
  turn: ConversationTurn,
  intent: string,
  options: { newestTurnIndex: number },
): { score: number; reasons: string[] } {
  const text = turn.messages.map((message) => message.content ?? '').join('\n');
  if (text.trim().length === 0) {
    return { score: 0, reasons: [] };
  }

  const reasons: string[] = [];

  const lexical = lexicalOverlap(text, intent);
  if (lexical > 0) reasons.push(`lexical:${lexical.toFixed(2)}`);

  const entity = entityOverlap(text, intent);
  if (entity > 0) reasons.push(`entity:${entity.toFixed(2)}`);

  const decision = DECISION_MARKER_PATTERN.test(text) ? 1 : 0;
  if (decision > 0) reasons.push('decision-marker');

  // Distance-decayed, so that between two equally relevant older turns the
  // later one wins — the one more likely to carry the current value of a
  // setting that has been changed since.
  const distance = Math.max(0, options.newestTurnIndex - turn.index);
  const recency = 1 / (1 + distance / 10);

  const score =
    RELEVANCE_WEIGHTS.lexical * lexical +
    RELEVANCE_WEIGHTS.entity * entity +
    RELEVANCE_WEIGHTS.decision * decision +
    RELEVANCE_WEIGHTS.recency * recency;

  return { score, reasons };
}

/** Word overlap, normalised by the shorter side. Kept as one signal of four. */
export function lexicalOverlap(a: string, b: string): number {
  const left = wordSet(a);
  const right = wordSet(b);
  if (left.size === 0 || right.size === 0) return 0;
  let hits = 0;
  for (const token of right) if (left.has(token)) hits += 1;
  return hits / right.size;
}

/**
 * Overlap on the things users actually plant and ask back about: coined
 * identifiers (`ORCHID-731`) and bare numbers (`7`). The old tokenizer dropped
 * both — it required four characters and stripped punctuation, so `ORCHID-731`
 * became two tokens and `7` became nothing at all.
 */
export function entityOverlap(a: string, b: string): number {
  const left = entitySet(a);
  const right = entitySet(b);
  if (right.size === 0) return 0;
  let hits = 0;
  for (const token of right) if (left.has(token)) hits += 1;
  return hits / right.size;
}

function wordSet(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s-]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= MIN_MATCH_TOKEN_LENGTH),
  );
}

function entitySet(value: string): Set<string> {
  const out = new Set<string>();
  for (const match of value.matchAll(PLANTED_IDENTIFIER_PATTERN)) {
    out.add(match[0].toUpperCase());
  }
  for (const match of value.matchAll(NUMERIC_TOKEN_PATTERN)) {
    out.add(match[0]);
  }
  return out;
}
