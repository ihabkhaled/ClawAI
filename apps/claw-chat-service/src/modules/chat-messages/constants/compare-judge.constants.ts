import { z } from 'zod';

/**
 * Comparative judging for Compare (ADR-116).
 *
 * The judge used to score each lane in its own call, so every score was
 * calibrated against nothing but the answer in front of it: a 0.8 on lane A and
 * a 0.8 on lane B were two unrelated opinions, and the "winner" was whichever
 * call happened to be more generous. One call that sees every answer at once,
 * on one scale, is the only way the numbers mean the same thing.
 */

/** Persisted verdict shape version. Bump when a field changes meaning. */
export const COMPARE_JUDGE_VERDICT_VERSION = 1;

/** The anonymous labels, in presentation order. Compare allows at most five lanes. */
export const COMPARE_JUDGE_LABELS: readonly string[] = Object.freeze(
  Array.from({ length: 26 }, (_, index) => String.fromCodePoint(65 + index)),
);

/** Fewer than this and there is nothing to compare, so the judge is not called. */
export const COMPARE_JUDGE_MIN_LANES = 2;

/** One shared scale for every lane. Integers read better than 0.73 vs 0.71. */
export const COMPARE_JUDGE_SCORE_MIN = 0;
export const COMPARE_JUDGE_SCORE_MAX = 10;

/**
 * The judge's answer is a short JSON object — one reason per lane plus a
 * rationale — so it needs far less room than a chat answer, and every token not
 * reserved for it is a token the candidate answers can use.
 */
export const COMPARE_JUDGE_MAX_OUTPUT_TOKENS = 1_500;

/**
 * How much conversation the judge sees. It needs the question and whatever
 * refined it, but history competes with the answers for the same window, and
 * the answers are what it is judging.
 */
export const COMPARE_JUDGE_HISTORY_LIMIT = 8;

/** Same ~4 chars/token heuristic as `estimateTokensFromText`. */
export const COMPARE_JUDGE_CHARS_PER_TOKEN = 4;

/** Headroom for the estimator being optimistic about a dense answer. */
export const COMPARE_JUDGE_BUDGET_SAFETY_PERCENT = 85;

/** Below this an answer is no longer judgeable, so it is never cut shorter. */
export const COMPARE_JUDGE_MIN_ANSWER_CHARS = 400;

/** Appended to every answer the budget shortened. The prompt explains it. */
export const COMPARE_JUDGE_TRUNCATION_MARKER = '\n[...shortened to fit the judge context window...]';

export const COMPARE_JUDGE_REASON_MAX_CHARS = 400;
export const COMPARE_JUDGE_RATIONALE_MAX_CHARS = 1_500;

/** The orchestration-timeline step shown while the one judge call runs. */
export const COMPARE_JUDGE_STAGE_LABEL = 'Ranking the answers side by side';

export const COMPARE_JUDGE_SYSTEM_PROMPT = [
  'You are an impartial judge comparing several candidate answers to the same user request.',
  '',
  'The candidates are labelled A, B, C and so on. The labels are random and the order is shuffled:',
  'they say nothing about which model wrote an answer. Do not favour a candidate for its position,',
  'its length or its style. Judge substance: correctness, completeness, relevance to what the user',
  'actually asked, and clarity.',
  '',
  `Score EVERY candidate on ONE shared scale from ${String(COMPARE_JUDGE_SCORE_MIN)} to ${String(COMPARE_JUDGE_SCORE_MAX)}, comparing the candidates against each other:`,
  `${String(COMPARE_JUDGE_SCORE_MAX)} is an excellent answer, ${String(COMPARE_JUDGE_SCORE_MIN)} is unusable. Answers of equal quality get equal scores.`,
  'If a candidate was shortened to fit your context window it says so; do not penalise the shortening itself.',
  '',
  'Respond with ONLY one JSON object - no prose, no code fences - with exactly these fields:',
  '{"ranking": ["B", "A"], "scores": [{"label": "A", "score": 6, "reason": "one short sentence"}, {"label": "B", "score": 8, "reason": "one short sentence"}], "rationale": "two or three sentences comparing the candidates"}',
  '- ranking: every label exactly once, best first. Tied candidates may appear in either order.',
  '- scores: exactly one entry per label. The ranking must never contradict the scores.',
  '- rationale: short and user-facing. Refer to candidates only by their label.',
].join('\n');

/**
 * The judge's output, field by field. Unknown keys are dropped rather than
 * rejected; everything the verdict depends on is required and typed, and the
 * cross-field invariants (every label once, ranking agrees with scores) are
 * checked after this in `parseCompareJudgeOutput`.
 */
export const compareJudgeOutputSchema = z.object({
  ranking: z.array(z.string().trim().min(1).max(3)).min(COMPARE_JUDGE_MIN_LANES).max(26),
  scores: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(3),
        score: z.number().finite().min(COMPARE_JUDGE_SCORE_MIN).max(COMPARE_JUDGE_SCORE_MAX),
        reason: z
          .string()
          .trim()
          .min(1)
          .transform((value) => value.slice(0, COMPARE_JUDGE_REASON_MAX_CHARS)),
      }),
    )
    .min(COMPARE_JUDGE_MIN_LANES)
    .max(26),
  rationale: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.slice(0, COMPARE_JUDGE_RATIONALE_MAX_CHARS)),
});
