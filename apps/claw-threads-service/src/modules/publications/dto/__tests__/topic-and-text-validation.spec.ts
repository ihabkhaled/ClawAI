import { retryThreadGenerationSchema } from '../retry-thread-generation.dto';
import { isStorableText } from '../safe-text.schema';
import { startThreadGenerationSchema } from '../start-thread-generation.dto';

const role = (id: string) => ({
  id,
  provider: 'provider',
  model: 'model',
  maxOutputTokens: 512,
  fallbacks: [],
});

const valid = {
  capMicroUsd: 2_000_000,
  sourceThreadId: 'thread-1',
  idempotencyKey: 'request-1',
  correlationId: 'correlation-1',
  publicIntentVersion: 'threads-public-v1',
  contentLocale: 'en',
  topic: 'A detailed research subject that is long enough',
  publicationType: 'article',
  authors: [role('author-1'), role('author-2'), role('author-3')],
  judge: role('judge'),
  critic: role('critic'),
};

function topicIssue(topic: string) {
  const result = startThreadGenerationSchema.safeParse({ ...valid, topic });
  return result.success
    ? null
    : (result.error.issues.find((issue) => issue.path[0] === 'topic') ?? null);
}

describe('topic validation (D-04, D-12, N-03e)', () => {
  it.each([
    ['twelve spaces', ' '.repeat(12)],
    ['spaces around too little text', `     ${'x'.repeat(5)}     `],
    ['a tab and newline block', '\t\n\t\n\t\n\t\n\t\n\t\n'],
    ['an empty string', ''],
    ['nine characters', 'ninechars'],
  ])('rejects %s with the topic code', (_name, topic) => {
    expect(topicIssue(topic)).toMatchObject({
      code: 'custom',
      params: { code: 'THREAD_TOPIC_INVALID' },
    });
  });

  it.each([
    ['a NUL byte', `valid topic text${String.fromCharCode(0)}more text`],
    ['a lone high surrogate', `valid topic text${String.fromCharCode(0xd83d)} more`],
    ['a lone low surrogate', `valid topic text${String.fromCharCode(0xde00)} more`],
  ])('rejects a topic with %s', (_name, topic) => {
    expect(topicIssue(topic)).toMatchObject({ params: { code: 'THREAD_TOPIC_INVALID' } });
  });

  it('accepts real text, emoji pairs and non-Latin scripts', () => {
    for (const topic of [
      'A detailed research subject',
      'Research on café culture 😀 across cities',
      'الذكاء الاصطناعي في التعليم',
    ]) {
      expect(startThreadGenerationSchema.safeParse({ ...valid, topic }).success).toBe(true);
    }
  });

  it('stores the topic trimmed', () => {
    const parsed = startThreadGenerationSchema.parse({
      ...valid,
      topic: '   A detailed research subject   ',
    });

    expect(parsed.topic).toBe('A detailed research subject');
  });

  it('still enforces the upper bound', () => {
    expect(topicIssue('x'.repeat(10_001))).not.toBeNull();
    expect(topicIssue('x'.repeat(10_000))).toBeNull();
  });

  it('applies the same rules to a retry topic and leaves it optional', () => {
    const base = { idempotencyKey: 'retry-1' };

    expect(retryThreadGenerationSchema.safeParse(base).success).toBe(true);
    expect(retryThreadGenerationSchema.safeParse({ ...base, topic: ' '.repeat(12) }).success).toBe(
      false,
    );
    expect(
      retryThreadGenerationSchema.safeParse({
        ...base,
        topic: `a topic${String.fromCharCode(0)}text`,
      }).success,
    ).toBe(false);
    expect(
      retryThreadGenerationSchema.safeParse({ ...base, topic: 'A real replacement topic' }).success,
    ).toBe(true);
  });
});

describe('other request text', () => {
  it.each([
    ['idempotencyKey', { idempotencyKey: `key${String.fromCharCode(0)}` }],
    ['correlationId', { correlationId: `id${String.fromCharCode(0xd800)}` }],
    ['sourceThreadId', { sourceThreadId: `t${String.fromCharCode(0)}` }],
    ['judge', { judge: { ...role('judge'), model: `m${String.fromCharCode(0)}` } }],
    ['critic', { critic: { ...role('critic'), provider: `p${String.fromCharCode(0xdc00)}` } }],
  ])('rejects an unstorable %s with the text code', (field, change) => {
    const result = startThreadGenerationSchema.safeParse({ ...valid, ...change });

    expect(result.success).toBe(false);
    const issue = result.success ? null : result.error.issues[0];
    expect(issue).toMatchObject({ params: { code: 'THREAD_TEXT_INVALID' } });
    expect(String(issue?.path[0])).toBe(field);
  });

  it('rejects unstorable text in a retry key and in a model change', () => {
    expect(
      retryThreadGenerationSchema.safeParse({ idempotencyKey: `k${String.fromCharCode(0)}` })
        .success,
    ).toBe(false);
    expect(
      retryThreadGenerationSchema.safeParse({
        idempotencyKey: 'k',
        models: [{ roleId: 'a', provider: 'P', model: `m${String.fromCharCode(0)}` }],
      }).success,
    ).toBe(false);
  });

  it('classifies storable text', () => {
    expect(isStorableText('plain')).toBe(true);
    expect(isStorableText('😀')).toBe(true);
    expect(isStorableText(String.fromCharCode(0))).toBe(false);
    expect(isStorableText(String.fromCharCode(0xd83d))).toBe(false);
  });
});
