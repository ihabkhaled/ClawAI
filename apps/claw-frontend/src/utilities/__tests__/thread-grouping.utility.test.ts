import { describe, expect, it } from 'vitest';

import { ThreadDateGroup } from '@/enums';
import type { ChatThread } from '@/types';
import { getThreadDateGroupId, groupThreadsByDate } from '@/utilities/thread-grouping.utility';

// Anchor "now" to noon so day-rollover edge cases stay deterministic regardless
// of the developer's local TZ.
const NOW = new Date('2026-06-01T12:00:00');

// Minimal ChatThread factory. Only `updatedAt` is read by the grouping helper;
// the rest is filled with sensible defaults so we don't have to spell out
// every required field per case.
function makeThread(id: string, updatedAt: string): ChatThread {
  return {
    id,
    userId: 'u1',
    title: null,
    routingMode: 'AUTO' as ChatThread['routingMode'],
    lastProvider: null,
    lastModel: null,
    preferredProvider: null,
    preferredModel: null,
    contextPackIds: [],
    isPinned: false,
    isArchived: false,
    systemPrompt: null,
    temperature: null,
    maxTokens: null,
    judgeEnabled: false,
    judgeModel: null,
    qualityThreshold: null,
    maxReRouteAttempts: null,
    useMemory: true,
    useContext: true,
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('getThreadDateGroupId', () => {
  it('classifies same-day updates as TODAY', () => {
    expect(getThreadDateGroupId('2026-06-01T08:00:00', NOW)).toBe(ThreadDateGroup.TODAY);
    expect(getThreadDateGroupId('2026-06-01T23:30:00', NOW)).toBe(ThreadDateGroup.TODAY);
  });

  it('classifies the previous calendar day as YESTERDAY', () => {
    expect(getThreadDateGroupId('2026-05-31T20:00:00', NOW)).toBe(ThreadDateGroup.YESTERDAY);
  });

  it('classifies 2-6 days ago as THIS_WEEK', () => {
    expect(getThreadDateGroupId('2026-05-30T08:00:00', NOW)).toBe(ThreadDateGroup.THIS_WEEK);
    expect(getThreadDateGroupId('2026-05-26T08:00:00', NOW)).toBe(ThreadDateGroup.THIS_WEEK);
  });

  it('classifies 7+ days ago as OLDER', () => {
    expect(getThreadDateGroupId('2026-05-25T08:00:00', NOW)).toBe(ThreadDateGroup.OLDER);
    expect(getThreadDateGroupId('2025-01-01T08:00:00', NOW)).toBe(ThreadDateGroup.OLDER);
  });

  it('falls back to OLDER for unparseable input', () => {
    expect(getThreadDateGroupId('garbage', NOW)).toBe(ThreadDateGroup.OLDER);
  });
});

describe('groupThreadsByDate', () => {
  it('drops empty buckets and preserves intra-bucket order', () => {
    const today = makeThread('t1', '2026-06-01T08:00:00');
    const yesterday = makeThread('t2', '2026-05-31T08:00:00');
    const olderA = makeThread('t3', '2026-05-10T08:00:00');
    const olderB = makeThread('t4', '2026-05-05T08:00:00');
    const result = groupThreadsByDate([today, yesterday, olderA, olderB], NOW);
    expect(result.map((g) => g.id)).toEqual([
      ThreadDateGroup.TODAY,
      ThreadDateGroup.YESTERDAY,
      ThreadDateGroup.OLDER,
    ]);
    expect(result[2]?.threads.map((t) => t.id)).toEqual(['t3', 't4']);
  });

  it('returns empty array for empty input', () => {
    expect(groupThreadsByDate([], NOW)).toEqual([]);
  });
});
