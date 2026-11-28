/**
 * The Thread topic minimum, counted like the threads-service does
 * (apps/claw-threads-service/.../topic-length.utility.ts; both use the same test vectors):
 * user-perceived characters, letters and numbers only, and a Chinese, Japanese or Korean
 * character weighs 2.5 so that 4 of them equal the 10 letters an alphabetic script needs.
 */
export const THREAD_TOPIC_MIN_WEIGHT = 10;

/**
 * The longest topic the box takes (owner order 2026-11-28): a long brief is read in parts by the
 * service. Same value as threads-service `TOPIC_MAX_LENGTH` and thread-generation-service.
 */
export const THREAD_TOPIC_MAX_LENGTH = 1_000_000;
export const THREAD_TOPIC_MIN_DENSE_CHARACTERS = 4;

const DENSE_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
const DENSE_WEIGHT = THREAD_TOPIC_MIN_WEIGHT / THREAD_TOPIC_MIN_DENSE_CHARACTERS;

export function threadTopicWeight(topic: string, stopAt = Number.POSITIVE_INFINITY): number {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  let weight = 0;
  for (const { segment } of segmenter.segment(topic.trim())) {
    if (!LETTER_OR_NUMBER.test(segment)) {
      continue;
    }
    weight += DENSE_SCRIPT.test(segment) ? DENSE_WEIGHT : 1;
    // The box holds up to a million characters and is tested on every key: stop once enough.
    if (weight >= stopAt) {
      break;
    }
  }
  return weight;
}

export function isThreadTopicLongEnough(topic: string): boolean {
  return threadTopicWeight(topic, THREAD_TOPIC_MIN_WEIGHT) >= THREAD_TOPIC_MIN_WEIGHT;
}
