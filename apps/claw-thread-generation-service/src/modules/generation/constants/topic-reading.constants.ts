/**
 * Reading a huge topic in parts (owner order 2026-11-28, ADR-229). The topic box takes up to a
 * million characters; a topic longer than half of the smallest model window is read part by part
 * into notes, and every later stage reads the notes (plus the opening of the raw topic, where the
 * owner's instructions usually sit) instead of a cut topic.
 */

/** The longest topic the service accepts; the same value as threads-service and the frontend box. */
export const TOPIC_MAX_LENGTH = 1_000_000;

/** The raw topic's opening kept next to the notes: the owner's instructions are usually here. */
export const TOPIC_HEAD_CHARS = 2_000;

/** Parts one topic is read in; a longer topic is sampled evenly and the notes say so. */
export const TOPIC_READING_MAX_PARTS = 400;

/** Parts read at the same time. */
export const TOPIC_READING_CONCURRENCY = 3;

/** A part is half the smallest window, in tokens; the other half is the prompt and the notes. */
export const TOPIC_PART_WINDOW_SHARE = 0.5;

/** The estimate every window check in the service uses (`estimateTextTokens`: length / 4). */
export const TOPIC_CHARS_PER_TOKEN = 4;

/** Notes of all parts together aim at this many characters, never more than the window in tokens. */
export const TOPIC_NOTES_TARGET_CHARS = 60_000;

/** Even with 400 parts, a part gets room for its facts. */
export const TOPIC_NOTES_MIN_PART_CHARS = 200;

/** A reply is clipped to this many times the part's allowance, so one chatty part cannot flood. */
export const TOPIC_NOTES_OVERRUN_FACTOR = 2;

/** Output tokens of a part's reply: its allowance plus room for a reasoning preamble. */
export const TOPIC_NOTES_CHARS_PER_OUTPUT_TOKEN = 3;
export const TOPIC_READER_MIN_OUTPUT_TOKENS = 768;
export const TOPIC_READER_MAX_OUTPUT_TOKENS = 8_192;
export const TOPIC_READER_OUTPUT_SLACK_TOKENS = 512;

/** Reading is skipped part by part once the job has spent this share of its cap. */
export const TOPIC_READER_SPEND_CEILING_PERCENT = 85;

/** One call and one retry on the same model per part, like planning: a part never fails the job. */
export const TOPIC_READER_HEAL_ATTEMPTS = 1;

/** Role key of one part's call: `topic-part-<n>`; the step log files it under BRIEF. */
export const TOPIC_PART_ROLE_PREFIX = 'topic-part';

/** The evidence hash a saved part reply carries (parts are read before research exists). */
export const TOPIC_PART_EVIDENCE_HASH = 'topic-reading';

/** Step code of the reading: done and total in the excerpt; SKIPPED rows are parts left unread. */
export const TOPIC_READING_CODE = 'TOPIC_READING';

export const TOPIC_READER_REPLY_SHAPE = '{"notes": string}';

export const TOPIC_GAP_UNREADABLE = 'could not be read';
export const TOPIC_GAP_SPEND = 'was not read to stay under the spend cap';

/** Where a part may end, best first: a blank line, a line end, a sentence end, any space. */
export const TOPIC_SPLIT_BREAKS: readonly RegExp[] = [
  /\n[ \t]*\n/gu,
  /\n/gu,
  /[.!?。！？؟…]["')\]”’]*\s|[。！？]/gu,
  /\s/gu,
];

/** A cut is looked for only in the last share of the window, so parts stay close to full size. */
export const TOPIC_SPLIT_LOOKBACK_SHARE = 0.3;

export const HIGH_SURROGATE_MIN = 0xd800;
export const HIGH_SURROGATE_MAX = 0xdbff;
