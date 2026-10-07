import { toFailedPayload } from '../failure-report.utility';

const job = {
  id: 'job-1',
  ownerId: 'owner-1',
  correlationId: 'corr-1',
  stage: 'AUTHOR_DRAFTS',
  attemptCount: 3,
  safeErrorCode: 'GENERATION_FAILED',
  failureSummary: 'ServiceUnavailableException: An author role failed',
  sourceSnapshotHash: 'a'.repeat(64),
  budgetCloseStatus: 'RELEASED',
  request: {
    topic: 'a private topic',
    authors: [
      { id: 'a1', provider: 'OLLAMA', model: 'gpt-oss:120b', maxOutputTokens: 4096, fallbacks: [] },
      {
        id: 'a2',
        provider: 'OLLAMA',
        model: 'glm-5.2',
        maxOutputTokens: 4096,
        fallbacks: [{ provider: 'GEMINI', model: 'gemini-2.5-flash' }],
      },
    ],
    judge: { id: 'j', provider: 'OLLAMA', model: 'minimax-m2.7', fallbacks: [] },
    critic: { id: 'c', provider: 'OLLAMA', model: 'mistral-large-3', fallbacks: [] },
  },
  createdAt: new Date('2026-10-07T10:00:00.000Z'),
  completedAt: new Date('2026-10-07T10:05:00.000Z'),
  updatedAt: new Date('2026-10-07T10:05:01.000Z'),
  attempts: [{ startedAt: new Date('2026-10-07T10:00:30.000Z') }],
};

describe('toFailedPayload', () => {
  it('reports the configured models, stage, counts and timings', () => {
    const payload = toFailedPayload(job);

    expect(payload.roles.map((role) => role.roleId)).toEqual(['a1', 'a2', 'j', 'c']);
    expect(payload.roles[1]?.fallbacks).toEqual([
      { provider: 'GEMINI', model: 'gemini-2.5-flash' },
    ]);
    expect(payload).toMatchObject({
      jobId: 'job-1',
      failedStage: 'AUTHOR_DRAFTS',
      attemptCount: 3,
      queuedAt: '2026-10-07T10:00:00.000Z',
      startedAt: '2026-10-07T10:00:30.000Z',
      failedAt: '2026-10-07T10:05:00.000Z',
    });
  });

  it('never carries the topic, conversation, prompts or token limits', () => {
    const text = JSON.stringify(toFailedPayload(job));

    expect(text).not.toContain('a private topic');
    expect(text).not.toContain('maxOutputTokens');
    expect(text).not.toMatch(/topic|sourceSnapshot"|markdown|prompt/u);
  });

  it('falls back safely when the request cannot be read', () => {
    const payload = toFailedPayload({
      ...job,
      request: 'not an object',
      safeErrorCode: null,
      attempts: [],
    });

    expect(payload.roles).toEqual([]);
    expect(payload.errorCode).toBe('GENERATION_FAILED');
    expect(payload.startedAt).toBeNull();
  });
});
