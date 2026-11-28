import { TOPIC_MAX_LENGTH } from '../../constants/topic-reading.constants';
import { enqueueGenerationSchema } from '../enqueue-generation.dto';
import { revisionReviewJobRequestSchema } from '../enqueue-revision-review.dto';
import { retryGenerationSchema } from '../retry-generation.dto';

/** True when the schema complains about the topic field itself (other fields may be missing). */
function topicRefused(
  schema: { safeParse: (value: unknown) => { success: boolean; error?: { issues: unknown[] } } },
  topic: string,
): boolean {
  const result = schema.safeParse({ topic });
  const issues = (result.error?.issues ?? []) as Array<{ path: unknown[] }>;
  return issues.some((issue) => issue.path[0] === 'topic');
}

describe('topic limit of the generation DTOs', () => {
  it('is one million characters, the same as threads-service', () => {
    expect(TOPIC_MAX_LENGTH).toBe(1_000_000);
  });

  it.each([
    ['enqueue', enqueueGenerationSchema],
    ['revision review', revisionReviewJobRequestSchema],
  ])('%s accepts 1,000,000 characters and refuses 1,000,001', (_name, schema) => {
    expect(topicRefused(schema, 'x'.repeat(1_000_000))).toBe(false);
    expect(topicRefused(schema, 'x'.repeat(1_000_001))).toBe(true);
    expect(topicRefused(schema, 'x'.repeat(9))).toBe(true);
  });

  it('retry accepts 1,000,000 characters and refuses 1,000,001', () => {
    const base = { ownerId: 'o', idempotencyKey: 'k' };
    expect(retryGenerationSchema.safeParse({ ...base, topic: 'x'.repeat(1_000_000) }).success).toBe(
      true,
    );
    expect(retryGenerationSchema.safeParse({ ...base, topic: 'x'.repeat(1_000_001) }).success).toBe(
      false,
    );
  });
});
