import {
  TOPIC_DENSE_SCRIPT,
  TOPIC_DENSE_WEIGHT,
  TOPIC_LETTER_OR_NUMBER,
  TOPIC_MIN_WEIGHT,
} from '../constants/topic-length.constants';

/**
 * A topic's length is counted in user-perceived characters, not UTF-16 units, and only letters and
 * numbers count (emoji, symbols and punctuation say nothing about a subject). Chinese, Japanese and
 * Korean write a whole idea in a few characters, so their characters weigh more: 4 are as much as
 * 10 letters of an alphabetic script. Keep this identical in meaning to the frontend copy
 * (apps/claw-frontend/src/utilities/thread-topic-length.utility.ts); both have the same vectors.
 */
export function topicLengthWeight(topic: string): number {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  let weight = 0;
  for (const { segment } of segmenter.segment(topic)) {
    if (!TOPIC_LETTER_OR_NUMBER.test(segment)) continue;
    weight += TOPIC_DENSE_SCRIPT.test(segment) ? TOPIC_DENSE_WEIGHT : 1;
  }
  return weight;
}

export function isTopicLongEnough(topic: string): boolean {
  return topicLengthWeight(topic) >= TOPIC_MIN_WEIGHT;
}
