import {
  VIDEO_FRAME_CLUSTER_STEP_MS,
  VIDEO_FRAME_EDGE_OFFSET_MS,
  VIDEO_FRAMES_PER_TURN_MAX,
  VIDEO_FRAMES_PER_VIDEO_MAX,
} from '../constants/video-delivery.constants';
import {
  ARABIC_DIGIT_PATTERN,
  ARABIC_INDIC_DIGIT_ZERO,
  CLOCK_TIMESTAMP_PATTERN,
  EXTENDED_ARABIC_INDIC_DIGIT_ZERO,
  HOUR_MS,
  MINUTE_MS,
  MINUTES_ONLY_PATTERNS,
  MINUTES_SECONDS_PATTERN,
  SECOND_MS,
  SECONDS_ONLY_PATTERNS,
  TIMESTAMP_SCAN_MAX_CHARS,
} from '../constants/video-timestamp.constants';
import type { QuestionTimestampMatch } from '../types/video-delivery.types';

/**
 * Which moments of a video to sample for this question (multimodal batch 8).
 * Deterministic, no model call.
 *
 *   - The user named a time (`2:35`, `at 95s`, `around 1 minute 30`, Arabic
 *     digits too) → frames cluster around each named time: t, t-4s, t+4s, …
 *     A named time past the end of the video is dropped, not clamped — the
 *     moment does not exist.
 *   - Otherwise → uniform coverage including the beginning, the middle and the
 *     end (each edge 0.5 s in, where a fade is less likely).
 *
 * Every timestamp is a whole millisecond inside [0, durationMs]; the list is
 * ascending with no duplicates and never longer than `maxFrames`.
 */
export function selectVideoFrameTimestamps(
  durationMs: number,
  question: string,
  maxFrames: number,
): number[] {
  const cap = Math.min(Math.floor(maxFrames), VIDEO_FRAMES_PER_TURN_MAX);
  if (!Number.isFinite(durationMs) || durationMs <= 0 || cap <= 0) {
    return [];
  }
  const anchors = uniqueInOrder(
    parseQuestionTimestamps(question).filter((ms) => ms <= durationMs),
  ).slice(0, cap);
  return anchors.length === 0
    ? uniformTimestamps(durationMs, cap)
    : clusteredTimestamps(anchors, durationMs, cap);
}

/** Every timestamp the question names, in ms, in the order they appear. */
export function parseQuestionTimestamps(question: string): number[] {
  const text = normalizeDigits(question.slice(0, TIMESTAMP_SCAN_MAX_CHARS));
  const matches: QuestionTimestampMatch[] = [];
  collect(text, CLOCK_TIMESTAMP_PATTERN, matches, clockMs);
  collect(text, MINUTES_SECONDS_PATTERN, matches, (groups) =>
    groups[1] === undefined || Number(groups[1]) >= 60
      ? null
      : Number(groups[0]) * MINUTE_MS + Number(groups[1]) * SECOND_MS,
  );
  for (const pattern of MINUTES_ONLY_PATTERNS) {
    collect(text, pattern, matches, (groups) => Number(groups[0]) * MINUTE_MS);
  }
  for (const pattern of SECONDS_ONLY_PATTERNS) {
    collect(text, pattern, matches, (groups) => Number(groups[0]) * SECOND_MS);
  }
  return matches.sort((a, b) => a.index - b.index).map((match) => match.ms);
}

/**
 * How many frames each attached video may take this turn: in attachment
 * order, each up to `VIDEO_FRAMES_PER_VIDEO_MAX`, until the per-turn cap is
 * spent. A video past the cap gets 0 and is served by its transcript.
 */
export function allocateTurnFrames(videoCount: number): number[] {
  const allocation: number[] = [];
  let remaining = VIDEO_FRAMES_PER_TURN_MAX;
  for (let index = 0; index < videoCount; index += 1) {
    const share = Math.min(VIDEO_FRAMES_PER_VIDEO_MAX, remaining);
    allocation.push(share);
    remaining -= share;
  }
  return allocation;
}

/**
 * `count` items spread evenly across `items` (first and last kept), for a
 * blind lane whose helper may describe fewer frames than were sampled.
 */
export function pickEvenly<T>(items: readonly T[], count: number): T[] {
  if (count <= 0) {
    return [];
  }
  if (count >= items.length) {
    return [...items];
  }
  if (count === 1) {
    return items.slice(Math.floor(items.length / 2), Math.floor(items.length / 2) + 1);
  }
  const picked: T[] = [];
  for (let slot = 0; slot < count; slot += 1) {
    const item = items[Math.round((slot * (items.length - 1)) / (count - 1))];
    if (item !== undefined) {
      picked.push(item);
    }
  }
  return picked;
}

function uniformTimestamps(durationMs: number, cap: number): number[] {
  if (cap === 1) {
    return [Math.round(durationMs / 2)];
  }
  const begin = Math.min(VIDEO_FRAME_EDGE_OFFSET_MS, durationMs);
  const end = Math.max(begin, durationMs - VIDEO_FRAME_EDGE_OFFSET_MS);
  const stamps: number[] = [];
  for (let slot = 0; slot < cap; slot += 1) {
    stamps.push(Math.round(begin + (slot * (end - begin)) / (cap - 1)));
  }
  return sortedUnique(stamps);
}

function clusteredTimestamps(
  anchors: readonly number[],
  durationMs: number,
  cap: number,
): number[] {
  const perAnchor = Math.max(1, Math.floor(cap / anchors.length));
  const offsets = clusterOffsets(perAnchor);
  const stamps = anchors.flatMap((anchor) =>
    offsets.map((offset) => Math.min(durationMs, Math.max(0, anchor + offset))),
  );
  return sortedUnique(stamps).slice(0, cap);
}

/** 0, -step, +step, -2·step, +2·step, … — the named moment first. */
function clusterOffsets(count: number): number[] {
  const offsets = [0];
  for (let ring = 1; offsets.length < count; ring += 1) {
    offsets.push(-ring * VIDEO_FRAME_CLUSTER_STEP_MS);
    if (offsets.length < count) {
      offsets.push(ring * VIDEO_FRAME_CLUSTER_STEP_MS);
    }
  }
  return offsets;
}

function clockMs(groups: readonly (string | undefined)[]): number | null {
  const [first, second, third] = groups;
  return third === undefined
    ? Number(first) * MINUTE_MS + Number(second) * SECOND_MS
    : Number(first) * HOUR_MS + Number(second) * MINUTE_MS + Number(third) * SECOND_MS;
}

function collect(
  text: string,
  pattern: RegExp,
  matches: QuestionTimestampMatch[],
  toMs: (groups: readonly (string | undefined)[]) => number | null,
): void {
  for (const match of text.matchAll(pattern)) {
    const index = match.index;
    const end = index + match[0].length;
    const overlaps = matches.some((taken) => index < taken.end && end > taken.index);
    const ms = overlaps ? null : toMs(match.slice(1));
    if (ms !== null && Number.isFinite(ms)) {
      matches.push({ index, end, ms });
    }
  }
}

function normalizeDigits(text: string): string {
  return text.replace(ARABIC_DIGIT_PATTERN, (digit) => {
    const code = digit.codePointAt(0) ?? ARABIC_INDIC_DIGIT_ZERO;
    const zero =
      code >= EXTENDED_ARABIC_INDIC_DIGIT_ZERO
        ? EXTENDED_ARABIC_INDIC_DIGIT_ZERO
        : ARABIC_INDIC_DIGIT_ZERO;
    return String(code - zero);
  });
}

function uniqueInOrder(values: readonly number[]): number[] {
  return [...new Set(values)];
}

function sortedUnique(values: readonly number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}
