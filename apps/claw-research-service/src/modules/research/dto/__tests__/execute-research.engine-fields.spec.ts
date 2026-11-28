import { describe, expect, it } from 'vitest';

import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import { PlatformCategory } from '../../../../generated/prisma';
import { executeResearchSchema } from '../execute-research.dto';
import { internalExecuteResearchSchema } from '../internal-execute-research.dto';

const base = { intent: 'what changed in the EU AI act' };

describe('research DTO engine fields (B1+B2)', () => {
  it('an old-shape request parses with none of the new fields set', () => {
    const parsed = executeResearchSchema.parse(base);

    expect(parsed).toEqual({ intent: base.intent, workflow: ResearchWorkflowKind.SEARCH_ONLY });
    for (const field of [
      'threadId',
      'queries',
      'languages',
      'depth',
      'round',
      'excludeUrls',
      'platforms',
    ]) {
      expect(parsed).not.toHaveProperty(field);
    }
  });

  it('accepts every field at its upper bound', () => {
    const result = executeResearchSchema.safeParse({
      ...base,
      threadId: 't'.repeat(64),
      queries: Array.from({ length: 12 }, (_, i) => `${String(i)} ${'q'.repeat(290)}`),
      languages: ['en', 'ar', 'de', 'fil', 'es', 'fr'],
      depth: 5,
      round: 5,
      excludeUrls: Array.from({ length: 60 }, (_, i) => `https://a.example/${String(i)}`),
    });

    expect(result.success).toBe(true);
  });

  it('platforms (B3): up to 6 PlatformCategory values', () => {
    const six = Object.values(PlatformCategory).slice(0, 6);
    expect(executeResearchSchema.parse({ ...base, platforms: six }).platforms).toEqual(six);
    expect(
      internalExecuteResearchSchema.parse({
        ...base,
        userId: 'u1',
        platforms: [PlatformCategory.ACADEMIC],
      }).platforms,
    ).toEqual([PlatformCategory.ACADEMIC]);
  });

  it('trims queries', () => {
    const parsed = executeResearchSchema.parse({ ...base, queries: ['  eu ai act fines  '] });

    expect(parsed.queries).toEqual(['eu ai act fines']);
  });

  it.each([
    ['threadId too long', { threadId: 't'.repeat(65) }],
    ['threadId empty', { threadId: '' }],
    ['13 queries', { queries: Array.from({ length: 13 }, () => 'query') }],
    ['query over 300', { queries: ['q'.repeat(301)] }],
    ['query under 2 after trim', { queries: ['  a  '] }],
    ['7 languages', { languages: ['en', 'ar', 'de', 'es', 'fr', 'it', 'ja'] }],
    ['upper-case language', { languages: ['EN'] }],
    ['region tag', { languages: ['en-US'] }],
    ['4-letter code', { languages: ['engl'] }],
    ['depth 6', { depth: 6 }],
    ['depth -1', { depth: -1 }],
    ['depth 1.5', { depth: 1.5 }],
    ['round 0', { round: 0 }],
    ['round 6', { round: 6 }],
    ['61 excludeUrls', { excludeUrls: Array.from({ length: 61 }, () => 'https://a.example') }],
    ['excludeUrl too long', { excludeUrls: [`https://a.example/${'x'.repeat(2048)}`] }],
    ['7 platform categories', { platforms: Object.values(PlatformCategory).slice(0, 7) }],
    ['unknown platform category', { platforms: ['GOSSIP'] }],
    ['lower-case platform category', { platforms: ['news'] }],
  ])('rejects %s', (_label, extra) => {
    expect(executeResearchSchema.safeParse({ ...base, ...extra }).success).toBe(false);
  });

  it('the internal (service-token) schema carries the same fields plus userId', () => {
    const parsed = internalExecuteResearchSchema.parse({
      ...base,
      userId: 'u1',
      threadId: 'thread-1',
      depth: 2,
      round: 2,
      queries: ['eu ai act fines'],
      languages: ['de'],
      excludeUrls: ['https://a.example/1'],
    });

    expect(parsed).toMatchObject({ userId: 'u1', threadId: 'thread-1', depth: 2, round: 2 });
  });
});
