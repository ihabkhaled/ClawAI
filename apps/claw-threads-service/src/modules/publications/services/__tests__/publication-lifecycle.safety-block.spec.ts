import { PublicationLifecycleService } from '../publication-lifecycle.service';
import { GenerationStartGate } from '../generation-start-gate.service';

const FLAGGED = 'Reach the author at person@example.com for details.';

function build(latest: object | null): {
  service: PublicationLifecycleService;
  createEditedRevision: ReturnType<typeof vi.fn>;
} {
  const createEditedRevision = vi.fn().mockResolvedValue({
    id: 'rev-2',
    revision: 2,
    generationJobId: 'j1',
    revalidationJobId: null,
    reviewStatus: 'PENDING',
    safetyApproved: false,
    safetyReasons: ['POSSIBLE_PII'],
    requestMatches: true,
    editInProgress: false,
  });
  const repository = {
    findOwnedGeneration: vi
      .fn()
      .mockResolvedValue({ id: 'p1', generationJobId: 'j1', status: 'DRAFT' }),
    hasPublishableRevision: vi.fn().mockResolvedValue(false),
    findLatestPublishableRevision: vi.fn().mockResolvedValue(null),
    findLatestRevisionSafety: vi.fn().mockResolvedValue(latest),
    savePrivateDraft: vi.fn().mockResolvedValue(undefined),
    createEditedRevision,
  };
  const generation = {
    getPrivateState: vi.fn().mockResolvedValue({
      jobId: 'j1',
      status: 'WAITING_FOR_REVIEW',
      stage: 'DONE',
      round: 1,
      safeErrorCode: null,
      terminal: true,
      review: null,
      draft: { markdown: '# Original', citations: [], judgeScore: 8, criticScore: 7 },
    }),
  };
  const service = new PublicationLifecycleService(
    repository as never,
    generation as never,
    { notifyPublished: vi.fn() } as never,
    new GenerationStartGate(),
  );
  return { service, createEditedRevision };
}

describe('a draft blocked by the safety scan stays recoverable', () => {
  it('shows the flagged passage and the newest stored text', async () => {
    const { service } = build({
      blocked: true,
      markdown: `# Title\n\n${FLAGGED}`,
      citations: [{ evidenceId: 'e1', url: 'https://example.com/a' }],
    });
    const state = await service.getGenerationState('p1', 'owner-1');
    expect(state.canPublish).toBe(false);
    expect(state.safetyBlock?.reasons).toEqual(['POSSIBLE_PII']);
    expect(state.safetyBlock?.findings[0]).toMatchObject({ kind: 'EMAIL' });
    expect(state.safetyBlock?.findings[0]?.excerpt).toContain('person@example.com');
    expect(state.draft?.markdown).toContain('person@example.com');
  });

  it('has no safetyBlock when the newest revision passed', async () => {
    const { service } = build({ blocked: false, markdown: '# ok', citations: [] });
    expect((await service.getGenerationState('p1', 'owner-1')).safetyBlock).toBeNull();
  });

  it('re-scans an edit that still holds the passage and names it again', async () => {
    const { service, createEditedRevision } = build(null);
    const result = await service.editRevision('p1', 'owner-1', {
      markdown: `# Title\n\n${FLAGGED}`,
      citations: [{ evidenceId: 'e1', url: 'https://example.com/a' }],
      capMicroUsd: 2_000_000,
      idempotencyKey: 'k1',
      correlationId: 'c1',
    });
    expect(result.status).toBe('REVIEW_REQUIRED');
    expect(result.reviewJobId).toBeNull();
    expect(result.findings?.[0]?.kind).toBe('EMAIL');
    expect(createEditedRevision.mock.calls[0]?.[3]).toEqual({
      approved: false,
      reasons: ['POSSIBLE_PII'],
    });
  });
});
