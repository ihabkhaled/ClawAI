// Heuristic follow-up detection — Phase 1 of the semantic router
// flagship plan (see docs/03-architecture/semantic-router-flagship-plan.md).
//
// Detects when a user message is a follow-up to the previous assistant
// answer ("make it shorter", "translate it", "do the second one", "in
// Arabic", "continue", etc.). The router and context assembler use this
// to decide whether the previous assistant answer MUST be included in
// the prompt regardless of token budget — losing that context is the
// most common reason follow-up turns fail across model switches.
//
// This is a *fast deterministic heuristic*. Phase 2 will swap in (or add
// alongside) a semantic AI analyzer for the harder cases. Until then this
// utility is the foundation: cheap, language-aware (EN + AR), and
// extensible via the FOLLOW_UP_SIGNALS map without code changes elsewhere.

import {
  FOLLOW_UP_PRONOUN_SIGNALS,
  FOLLOW_UP_REGEX_SIGNALS,
  FOLLOW_UP_SHORT_REPLY_MAX_WORDS,
  FOLLOW_UP_VERB_SIGNALS,
} from '../constants/follow-up-detection.constants';
import type { FollowUpDetection } from '../types/follow-up-detection.types';

export function detectFollowUp(message: string): FollowUpDetection {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { isFollowUp: false, signals: [], confidence: 0 };
  }

  const normalized = trimmed.toLowerCase();
  const signals: string[] = [];
  let score = 0;

  // 1. Explicit short imperatives like "continue", "more", "go on" — strong.
  for (const verb of FOLLOW_UP_VERB_SIGNALS) {
    if (normalized === verb || normalized === `${verb}.` || normalized === `${verb}!`) {
      signals.push(`exact_imperative:${verb}`);
      score += 0.8;
      break;
    }
  }

  // 2. Pattern match for "make it X", "translate it to Y", "do the same",
  //    "fix the second one", "regenerate", "in arabic", etc.
  for (const { name, regex, weight } of FOLLOW_UP_REGEX_SIGNALS) {
    if (regex.test(normalized)) {
      signals.push(`pattern:${name}`);
      score += weight;
    }
  }

  // 3. Anaphoric pronouns ("it", "this", "that", "them", "these")
  //    as the message's *subject* are a weak signal — they need a referent.
  const words = normalized.split(/\s+/);
  if (words.length <= FOLLOW_UP_SHORT_REPLY_MAX_WORDS) {
    for (const pronoun of FOLLOW_UP_PRONOUN_SIGNALS) {
      if (words.includes(pronoun)) {
        signals.push(`pronoun:${pronoun}`);
        score += 0.15;
        break;
      }
    }
  }

  // 4. Very short reply on its own (≤ 4 words) is almost always a follow-up
  //    relative to the prior turn — "shorter", "in french", "as code",
  //    "make it polite". Bonus once.
  if (words.length > 0 && words.length <= 4 && signals.length > 0) {
    signals.push('short_reply');
    score += 0.15;
  }

  const confidence = Math.min(1, score);
  const isFollowUp = confidence >= 0.5;
  return { isFollowUp, signals, confidence };
}
