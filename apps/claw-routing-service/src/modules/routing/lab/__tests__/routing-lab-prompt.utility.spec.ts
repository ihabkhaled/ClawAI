import { RoutingLabPromptLengthBucket } from '../../../../common/enums';
import { DomainTag } from '../../../../generated/prisma';
import { ROUTING_LAB_LENGTH_BUCKET_TARGET_CHARS } from '../constants/routing-lab-corpus-dimensions.constants';
import { buildRoutingLabPrompt } from '../utilities/routing-lab-prompt.utility';

describe('buildRoutingLabPrompt', () => {
  it('is deterministic: the same domain and bucket always produce the same prompt', () => {
    const first = buildRoutingLabPrompt(DomainTag.CODING, RoutingLabPromptLengthBucket.MEDIUM);
    const second = buildRoutingLabPrompt(DomainTag.CODING, RoutingLabPromptLengthBucket.MEDIUM);
    expect(first).toBe(second);
  });

  it("reaches each bucket's target character count exactly", () => {
    for (const bucket of Object.values(RoutingLabPromptLengthBucket)) {
      const prompt = buildRoutingLabPrompt(DomainTag.GENERAL, bucket);
      const target = ROUTING_LAB_LENGTH_BUCKET_TARGET_CHARS[bucket] ?? 0;
      expect(prompt).toHaveLength(target);
      expect(target).toBeGreaterThan(0);
    }
  });

  it('produces different content for different domains at the same bucket', () => {
    const coding = buildRoutingLabPrompt(DomainTag.CODING, RoutingLabPromptLengthBucket.SHORT);
    const legal = buildRoutingLabPrompt(DomainTag.LEGAL, RoutingLabPromptLengthBucket.SHORT);
    expect(coding).not.toBe(legal);
  });

  it('grows with length bucket for the same domain', () => {
    const short = buildRoutingLabPrompt(DomainTag.RESEARCH, RoutingLabPromptLengthBucket.SHORT);
    const long = buildRoutingLabPrompt(DomainTag.RESEARCH, RoutingLabPromptLengthBucket.LONG);
    expect(long.length).toBeGreaterThan(short.length);
  });
});
