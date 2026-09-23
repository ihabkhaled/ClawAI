import { createHash } from 'node:crypto';

import {
  CompareJudgeState,
  CompareJudgeVerdictStatus,
  FileDeliveryMode,
} from '../../../common/enums';
import {
  COMPARE_JUDGE_BUDGET_SAFETY_PERCENT,
  COMPARE_JUDGE_CHARS_PER_TOKEN,
  COMPARE_JUDGE_LABELS,
  COMPARE_JUDGE_MIN_ANSWER_CHARS,
  COMPARE_JUDGE_SCORE_MAX,
  COMPARE_JUDGE_SCORE_MIN,
  COMPARE_JUDGE_TRUNCATION_MARKER,
  COMPARE_JUDGE_VERDICT_VERSION,
  compareJudgeOutputSchema,
} from '../constants/compare-judge.constants';
import { REVIEW_ORIGINAL_INSTRUCTIONS_FRAME } from '../constants/judge-referee.constants';
import type {
  CompareJudgeLaneInput,
  CompareJudgeLaneResult,
  CompareJudgePromptInput,
  CompareJudgeRankedInput,
  CompareJudgeShuffle,
  CompareJudgeUnrankedInput,
  CompareJudgeVerdict,
  FairTruncationResult,
  ParsedCompareJudgeOutput,
} from '../types/compare-judge.types';
import type { ModelTokenBudget } from '../types/context-composer.types';
import type { AssembledContext } from '../types/context.types';
import { estimateTokensFromText } from './token-estimator.utility';

/** The anonymous label for a presentation position: 0 → "A", 1 → "B". */
export function compareJudgeLabelAt(position: number): string {
  return COMPARE_JUDGE_LABELS[position] ?? `L${String(position + 1)}`;
}

/**
 * Orders the lanes for the judge, deterministically for a run.
 *
 * A Fisher-Yates shuffle driven by SHA-256 of `seed:step`, not `Math.random`.
 * Position bias is real — judges prefer the first candidate — so the order must
 * not be the order the user picked models in. It must also be reproducible: the
 * verdict names candidates by label, and the only way to turn "B" back into a
 * lane after the fact is to know exactly which lane B was.
 */
export function buildLaneShuffle(seed: string, laneIndices: readonly number[]): CompareJudgeShuffle {
  const order = [...laneIndices];
  for (let step = order.length - 1; step > 0; step -= 1) {
    const swapWith = seededIndex(seed, step, step + 1);
    const current = order[step];
    const other = order[swapWith];
    if (current === undefined || other === undefined) {
      continue;
    }
    order[step] = other;
    order[swapWith] = current;
  }
  return { seed, order, labels: order.map((_, position) => compareJudgeLabelAt(position)) };
}

function seededIndex(seed: string, step: number, bound: number): number {
  const digest = createHash('sha256').update(`${seed}:${String(step)}`).digest();
  return digest.readUInt32BE(0) % bound;
}

/** The lane the judge knew as `label`, or null for a label it was never shown. */
export function laneIndexForLabel(shuffle: CompareJudgeShuffle, label: string): number | null {
  const position = shuffle.labels.indexOf(label);
  return position < 0 ? null : (shuffle.order[position] ?? null);
}

/**
 * Cuts the answers to fit a character budget, fairly.
 *
 * Max-min fair ("water-filling"): every answer that has to be shortened is cut
 * to the SAME length, and an answer shorter than that length is never touched.
 * Cutting each answer by the same fraction instead would punish the thorough
 * answer twice — once by the cut and again by the judge reading less of it.
 * Nothing is cut below `COMPARE_JUDGE_MIN_ANSWER_CHARS`: past that point an
 * answer cannot be judged at all, and the prompt says so either way.
 */
export function fitAnswersFairly(texts: readonly string[], budgetChars: number): FairTruncationResult {
  const total = texts.reduce((sum, text) => sum + text.length, 0);
  if (total <= budgetChars) {
    return { texts: [...texts], truncated: texts.map(() => false), capChars: null };
  }
  const cap = Math.max(
    COMPARE_JUDGE_MIN_ANSWER_CHARS,
    fairCap(
      texts.map((text) => text.length),
      budgetChars,
    ),
  );
  const truncated = texts.map((text) => text.length > cap);
  return {
    texts: texts.map((text) =>
      text.length > cap ? `${sliceWholeCodePoints(text, cap)}${COMPARE_JUDGE_TRUNCATION_MARKER}` : text,
    ),
    truncated,
    capChars: truncated.some(Boolean) ? cap : null,
  };
}

function fairCap(lengths: readonly number[], budgetChars: number): number {
  const ascending = [...lengths].sort((left, right) => left - right);
  let remaining = Math.max(0, budgetChars);
  for (const [position, length] of ascending.entries()) {
    const share = Math.floor(remaining / (ascending.length - position));
    if (length > share) {
      return share;
    }
    remaining -= length;
  }
  return ascending.at(-1) ?? 0;
}

// A cut through a surrogate pair leaves half an emoji the provider may reject.
// An astral code point starting at the last kept index straddles the cut.
function sliceWholeCodePoints(text: string, maxChars: number): string {
  const lastKept = text.codePointAt(maxChars - 1) ?? 0;
  return text.slice(0, lastKept > 0xff_ff ? maxChars - 1 : maxChars);
}

/**
 * Characters the candidate answers may use in the judge's window.
 *
 * The window minus everything else that has to fit: the reserved answer, the
 * gateway's system overhead (memories, files, packs), tools, and what the
 * caller has already committed — history, the framed system prompt and the
 * prompt skeleton around the answers. The same ~4 chars/token estimate the rest
 * of the service uses, with headroom because a dense answer beats it.
 */
export function computeAnswerBudgetChars(budget: ModelTokenBudget, committedTokens: number): number {
  const freeTokens =
    budget.contextWindowTokens -
    budget.reservedOutputTokens -
    budget.systemOverheadTokens -
    budget.toolOverheadTokens -
    committedTokens;
  return Math.floor(
    (Math.max(0, freeTokens) * COMPARE_JUDGE_CHARS_PER_TOKEN * COMPARE_JUDGE_BUDGET_SAFETY_PERCENT) /
      100,
  );
}

/** Estimated tokens of the conversation history the judge will be sent. */
export function estimateHistoryTokens(context: AssembledContext): number {
  return context.threadMessages.reduce(
    (sum, message) => sum + estimateTokensFromText(message.content),
    0,
  );
}

/**
 * The judge's system prompt: its own brief, with the lanes' instructions shown
 * as DATA. Same framing as the single-lane judge — a thread whose system prompt
 * says "answer only in French" must not produce a French JSON verdict.
 */
export function frameCompareJudgeSystemPrompt(
  instructions: string | null,
  judgePrompt: string,
): string {
  const original = instructions?.trim() ?? '';
  return original.length > 0
    ? [REVIEW_ORIGINAL_INSTRUCTIONS_FRAME, original, '---', judgePrompt].join('\n\n')
    : judgePrompt;
}

/** Filenames a lane could not receive, so the judge does not blame it for ignoring them. */
export function missingFilesForLane(lane: CompareJudgeLaneInput): string[] {
  return (lane.attachmentDelivery ?? [])
    .filter(
      (entry) =>
        entry.mode === FileDeliveryMode.OMITTED_NO_VISION ||
        entry.mode === FileDeliveryMode.OMITTED_UNSUPPORTED,
    )
    .map((entry) => entry.filename);
}

// An answer containing "</candidate>" must not be able to close its own block
// and start writing instructions to the judge.
function neutraliseCandidateTags(text: string): string {
  return text.replaceAll(/<(\/?)candidate/giu, '&lt;$1candidate');
}

/**
 * The review question: every candidate, labelled, in shuffled order.
 *
 * When answers were shortened the prompt says which, and to what length, in
 * plain words. A judge that is not told reads a cut-off answer as an unfinished
 * one and marks it down for the budget's decision.
 */
export function buildCompareJudgeQuestion(input: CompareJudgePromptInput): string {
  const count = input.labels.length;
  const lines: string[] = [
    `Compare the ${String(count)} candidate answers below. Each one answers the user's most recent message in this conversation.`,
    `Candidates: ${input.labels.join(', ')}.`,
  ];
  const shortened = input.labels.filter((_, position) => input.truncated[position] === true);
  if (input.capChars !== null && shortened.length > 0) {
    lines.push(
      `Note: the answers did not all fit your context window. Candidate(s) ${shortened.join(', ')} were each shortened to the same length of ${String(input.capChars)} characters; every other candidate is complete. A shortened answer ends with "${COMPARE_JUDGE_TRUNCATION_MARKER.trim()}". Judge what is shown and do not penalise the shortening itself.`,
    );
  }
  for (const [position, label] of input.labels.entries()) {
    lines.push('', ...candidateBlock(label, position, input));
  }
  lines.push(
    '',
    `Score every candidate from ${String(COMPARE_JUDGE_SCORE_MIN)} to ${String(COMPARE_JUDGE_SCORE_MAX)} on the same scale and return the JSON object now.`,
  );
  return lines.join('\n');
}

function candidateBlock(label: string, position: number, input: CompareJudgePromptInput): string[] {
  const block = [
    `<candidate label="${label}">`,
    neutraliseCandidateTags(input.texts[position] ?? ''),
    '</candidate>',
  ];
  const notes = input.criticNotes[position];
  if (notes !== null && notes !== undefined && notes.length > 0) {
    block.push(`Critic notes on candidate ${label}: ${notes.join('; ')}`);
  }
  const missing = input.missingFiles[position] ?? [];
  if (missing.length > 0) {
    block.push(
      `Candidate ${label} could not receive these attachments: ${missing.join(', ')}. Do not penalise it for not using them.`,
    );
  }
  return block;
}

/** The first JSON object in a model reply, tolerating a code fence. Null when there is none. */
function extractJsonObject(content: string): unknown {
  let text = content.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/u.exec(text);
  if (fenced?.[1] !== undefined) {
    text = fenced[1].trim();
  }
  const objectMatch = /\{[\s\S]*\}/u.exec(text);
  if (objectMatch === null) {
    return null;
  }
  try {
    return JSON.parse(objectMatch[0]) as unknown;
  } catch {
    return null;
  }
}

/**
 * Parses the judge's reply against the schema AND its invariants, or returns
 * null. Null is the only honest answer to a malformed verdict: guessing a
 * ranking from prose is how a fake winner gets rendered with a trophy on it.
 *
 * Invariants beyond the field types: every shown label appears exactly once in
 * `ranking` and exactly once in `scores`, and walking `ranking` best-first never
 * meets a score higher than the one before it.
 */
export function parseCompareJudgeOutput(
  content: string,
  labels: readonly string[],
): ParsedCompareJudgeOutput | null {
  const parsed = compareJudgeOutputSchema.safeParse(extractJsonObject(content));
  if (!parsed.success) {
    return null;
  }
  const ranking = parsed.data.ranking.map((label) => label.toUpperCase());
  const scores = parsed.data.scores.map((entry) => ({
    ...entry,
    label: entry.label.toUpperCase(),
  }));
  if (
    !isExactlyTheLabels(ranking, labels) ||
    !isExactlyTheLabels(
      scores.map((entry) => entry.label),
      labels,
    )
  ) {
    return null;
  }
  const scoreOf = new Map(scores.map((entry) => [entry.label, entry.score]));
  const contradicts = ranking.some((label, position) => {
    const next = ranking[position + 1];
    return next !== undefined && (scoreOf.get(next) ?? 0) > (scoreOf.get(label) ?? 0);
  });
  return contradicts ? null : { ranking, scores, rationale: parsed.data.rationale };
}

function isExactlyTheLabels(candidate: readonly string[], labels: readonly string[]): boolean {
  const seen = new Set(candidate);
  return (
    candidate.length === labels.length &&
    seen.size === candidate.length &&
    labels.every((label) => seen.has(label))
  );
}

/**
 * Unshuffles a parsed verdict back onto the lanes and ranks them.
 *
 * Ranks are competition ranks from the scores (equal scores share a rank), so a
 * tie is a tie however the judge happened to order the tied labels. A tie for
 * first place names no winner — `winnerLaneIndex` stays null and the tied lanes
 * are listed instead.
 */
export function buildRankedVerdict(input: CompareJudgeRankedInput): CompareJudgeVerdict {
  const scoreByLabel = new Map(input.parsed.scores.map((entry) => [entry.label, entry]));
  const lanes: CompareJudgeLaneResult[] = input.parsed.ranking.flatMap((label) => {
    const laneIndex = laneIndexForLabel(input.shuffle, label);
    const lane = input.lanes.find((candidate) => candidate.laneIndex === laneIndex);
    const scored = scoreByLabel.get(label);
    if (laneIndex === null || lane === undefined || scored === undefined) {
      return [];
    }
    const position = input.shuffle.labels.indexOf(label);
    const critique = input.critiques.find((entry) => entry.laneIndex === laneIndex);
    return [
      {
        laneIndex,
        label,
        provider: lane.provider,
        model: lane.model,
        score: scored.score,
        rank: 1 + input.parsed.scores.filter((entry) => entry.score > scored.score).length,
        reason: scored.reason,
        truncated: input.truncatedByLabel[position] === true,
        criticSummary: critique?.summary ?? null,
      },
    ];
  });
  const first = lanes.filter((lane) => lane.rank === 1);
  return {
    ...emptyVerdictFields(input.judgeModel, input.latencyMs, input.usage),
    status: CompareJudgeVerdictStatus.RANKED,
    lanes,
    winnerLaneIndex: first.length === 1 ? (first[0]?.laneIndex ?? null) : null,
    tiedLaneIndices: first.length > 1 ? first.map((lane) => lane.laneIndex) : [],
    rationale: input.parsed.rationale,
    shuffle: input.shuffle,
    truncated: input.truncatedByLabel.some(Boolean),
  };
}

/** A verdict with no ranking and, by construction, no winner. */
export function buildUnrankedVerdict(input: CompareJudgeUnrankedInput): CompareJudgeVerdict {
  return {
    ...emptyVerdictFields(input.judgeModel, input.latencyMs, input.usage),
    status: input.status,
    failureReason: input.failureReason,
    shuffle: input.shuffle,
    truncated: input.truncated,
  };
}

function emptyVerdictFields(
  judgeModel: string,
  latencyMs: number,
  usage: CompareJudgeVerdict['usage'],
): CompareJudgeVerdict {
  return {
    version: COMPARE_JUDGE_VERDICT_VERSION,
    status: CompareJudgeVerdictStatus.UNAVAILABLE,
    failureReason: null,
    judgeModel,
    scale: { min: COMPARE_JUDGE_SCORE_MIN, max: COMPARE_JUDGE_SCORE_MAX },
    lanes: [],
    winnerLaneIndex: null,
    tiedLaneIndices: [],
    rationale: null,
    shuffle: null,
    truncated: false,
    latencyMs,
    usage,
    judgedAt: new Date().toISOString(),
  };
}

/**
 * The per-lane badge state for a comparative verdict. A lane that did not
 * complete was never in the comparison, whatever the verdict says.
 */
export function resolveLaneJudgeState(
  laneCompleted: boolean,
  verdict: CompareJudgeVerdict,
): { judgeState: CompareJudgeState; judgeErrorState: CompareJudgeState | null } {
  if (!laneCompleted || verdict.status === CompareJudgeVerdictStatus.SKIPPED) {
    return { judgeState: CompareJudgeState.SKIPPED, judgeErrorState: CompareJudgeState.SKIPPED };
  }
  return verdict.status === CompareJudgeVerdictStatus.RANKED
    ? { judgeState: CompareJudgeState.RANKED, judgeErrorState: null }
    : {
        judgeState: CompareJudgeState.UNAVAILABLE,
        judgeErrorState: CompareJudgeState.UNAVAILABLE,
      };
}
