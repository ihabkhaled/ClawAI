/**
 * The Thread topic minimum, counted like the threads-service does
 * (apps/claw-threads-service/.../topic-length.utility.ts; both use the same test vectors):
 * user-perceived characters, letters and numbers only, and a Chinese, Japanese or Korean
 * character weighs 2.5 so that 4 of them equal the 10 letters an alphabetic script needs.
 */
export const THREAD_TOPIC_MIN_WEIGHT = 10;
export const THREAD_TOPIC_MIN_DENSE_CHARACTERS = 4;

const DENSE_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
const DENSE_WEIGHT = THREAD_TOPIC_MIN_WEIGHT / THREAD_TOPIC_MIN_DENSE_CHARACTERS;

export function threadTopicWeight(topic: string): number {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  let weight = 0;
  for (const { segment } of segmenter.segment(topic.trim())) {
    if (!LETTER_OR_NUMBER.test(segment)) {
      continue;
    }
    weight += DENSE_SCRIPT.test(segment) ? DENSE_WEIGHT : 1;
  }
  return weight;
}

export function isThreadTopicLongEnough(topic: string): boolean {
  return threadTopicWeight(topic) >= THREAD_TOPIC_MIN_WEIGHT;
}
