import { describe, expect, it } from 'vitest';

import {
  isThreadTopicLongEnough,
  THREAD_TOPIC_MAX_LENGTH,
  threadTopicWeight,
} from '../thread-topic-length.utility';

describe('isThreadTopicLongEnough', () => {
  it.each([
    ['Chinese, 3 characters', '人工智'],
    ['Japanese, 3 characters', '人工知'],
    ['Korean, 3 syllables', '인공지'],
    ['Thai, 9 letters', 'สวัสดีครับ'.slice(0, 9)],
    ['Arabic, 9 letters', 'ذكاء اصطن'],
    ['emoji only', '😀😀😀😀😀😀😀😀😀😀😀😀'],
    ['punctuation only', '!!!!!!!!!!!!'],
    ['spaces', ' '.repeat(20)],
    ['Thai clusters with marks', 'ก็ก็ก็ก็ก็ก็ก็ก็ก็'],
  ])('rejects %s', (_name, topic) => {
    expect(isThreadTopicLongEnough(topic)).toBe(false);
  });

  it.each([
    ['Chinese, 4 characters', '人工智能'],
    ['Japanese, 4 characters', '人工知能'],
    ['Japanese kana', 'ひらがなだ'],
    ['Korean, 4 syllables', '인공지능'],
    ['Arabic, ten letters', 'الذكاء الاصطناعي'],
    ['Thai, ten clusters', 'ก็ก็ก็ก็ก็ก็ก็ก็ก็ก็'],
    ['mixed Latin and Chinese', 'AI 与教育学'],
    ['ten Latin letters', 'tenletters'],
  ])('accepts %s', (_name, topic) => {
    expect(isThreadTopicLongEnough(topic)).toBe(true);
  });
});

describe('a topic of up to a million characters', () => {
  it('has the same limit as the services', () => {
    expect(THREAD_TOPIC_MAX_LENGTH).toBe(1_000_000);
  });

  it('is judged long enough without counting every character', () => {
    const topic = 'word '.repeat(200_000);
    expect(isThreadTopicLongEnough(topic)).toBe(true);
    expect(threadTopicWeight(topic, 10)).toBeLessThan(20);
    expect(threadTopicWeight('abcdef')).toBe(6);
  });
});
