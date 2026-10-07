import type { ThreadGenerationFailedPayload } from '@claw/shared-types';

import {
  renderThreadFailureTicket,
  threadFailureExternalKey,
  threadFailureTitle,
} from '../thread-failure-ticket.utility';

const payload: ThreadGenerationFailedPayload = {
  jobId: 'job-1',
  correlationId: 'corr-1',
  errorCode: 'GENERATION_FAILED',
  ownerId: 'owner-1',
  failedStage: 'AUTHOR_DRAFTS',
  attemptCount: 3,
  failureSummary: 'ServiceUnavailableException: An author role failed',
  sourceSnapshotHash: 'a'.repeat(64),
  budgetCloseStatus: 'RELEASED',
  roles: [
    { roleId: 'a1', provider: 'OLLAMA', model: 'gpt-oss:120b', fallbacks: [] },
    {
      roleId: 'j',
      provider: 'OLLAMA',
      model: 'minimax-m2.7',
      fallbacks: [{ provider: 'GEMINI', model: 'gemini-2.5-flash' }],
    },
  ],
  queuedAt: '2026-10-07T10:00:00.000Z',
  startedAt: '2026-10-07T10:00:30.000Z',
  failedAt: '2026-10-07T10:05:00.000Z',
};

describe('thread failure ticket', () => {
  it('keys the ticket on the job so a redelivered event finds it', () => {
    expect(threadFailureExternalKey('job-1')).toBe('threads-generation:job-1');
  });

  it('names the stage and the job in the title', () => {
    expect(threadFailureTitle(payload)).toBe(
      'Threads generation failed at AUTHOR_DRAFTS (job job-1)',
    );
  });

  it('lists the diagnostics an admin needs', () => {
    const text = renderThreadFailureTicket(payload);

    expect(text).toContain('| Failed stage | AUTHOR_DRAFTS |');
    expect(text).toContain('| Queue wait (ms) | 30000 |');
    expect(text).toContain('| Total duration (ms) | 300000 |');
    expect(text).toContain('| Credit reservation | RELEASED |');
    expect(text).toContain('**j**: OLLAMA / minimax-m2.7 (fallbacks: GEMINI / gemini-2.5-flash)');
  });

  it('cannot be broken out of its table by a hostile summary', () => {
    const text = renderThreadFailureTicket({
      ...payload,
      failureSummary: 'x | y\n## Injected heading',
    });

    expect(text).toContain('| Last error | x y ## Injected heading |');
    expect(text).not.toContain('\n## Injected heading');
  });

  it('handles a job that never started', () => {
    const text = renderThreadFailureTicket({ ...payload, startedAt: null, roles: [] });

    expect(text).toContain('| Started at | n/a |');
    expect(text).toContain('| Queue wait (ms) | n/a |');
    expect(text).toContain('- none recorded');
  });
});
