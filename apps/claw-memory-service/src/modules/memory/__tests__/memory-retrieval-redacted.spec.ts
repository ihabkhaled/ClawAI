import { vi } from 'vitest';
import { MemorySensitivity, MemoryType } from '../../../generated/prisma';
import { MemoryRetrievalService } from '../services/memory-retrieval.service';

function service(memories: object[]): MemoryRetrievalService {
  return new MemoryRetrievalService(
    { findByUserScopeForRetrieval: vi.fn().mockResolvedValue(memories) } as never,
    { get: vi.fn().mockResolvedValue({ pausedAll: false }) } as never,
    { record: vi.fn() } as never,
    { record: vi.fn() } as never,
    { search: vi.fn().mockResolvedValue([]) } as never,
    {} as never,
    {} as never,
  );
}

describe('MemoryRetrievalService — REDACTED memories (owner bug 5)', () => {
  it('returns the masked body instead of null, so the prompt never gets an empty memory', async () => {
    const body = `# Rules\n\nAlways cite the spec.\nKey AKIA1234567890ABCDEF rotated.\n${'x'.repeat(5_000)}`;
    const bundle = await service([
      {
        id: 'm1',
        type: MemoryType.INSTRUCTION,
        content: body,
        sensitivity: MemorySensitivity.REDACTED,
        pinned: false,
        scope: 'USER',
        scopeRef: null,
        sourceThreadId: null,
        sourceMessageId: null,
        qualityScore: 0.5,
        priority: 50,
        updatedAt: new Date(),
        createdAt: new Date(),
      },
    ]).retrieve({
      userId: 'u1',
      intent: 'spec',
      attachedPackIds: [],
      attachedMemoryIds: [],
      tokenBudget: 4096,
      includeMemory: true,
      includeContext: false,
    } as never);
    const content = bundle.memories[0]?.content ?? null;
    expect(content).not.toBeNull();
    expect(content).toHaveLength(body.length);
    expect(content).toContain('Always cite the spec.');
    expect(content).not.toContain('AKIA1234567890ABCDEF');
  });
});
