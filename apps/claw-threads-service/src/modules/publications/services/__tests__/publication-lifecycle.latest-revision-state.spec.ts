import { PublicationLifecycleService } from '../publication-lifecycle.service';
import { GenerationStartGate } from '../generation-start-gate.service';

const ORIGINAL_HASH = 'a'.repeat(64);
const EDIT_HASH = 'b'.repeat(64);

function build(latest: object | null): PublicationLifecycleService {
  const repository = {
    findOwnedGeneration: vi
      .fn()
      .mockResolvedValue({ id: 'p1', generationJobId: 'j1', status: 'PUBLISHED' }),
    hasPublishableRevision: vi.fn().mockResolvedValue(true),
    findLatestRevisionSafety: vi.fn().mockResolvedValue(null),
    findLatestPublishableRevision: vi.fn().mockResolvedValue(latest),
  };
  const generation = {
    getPrivateState: vi.fn().mockResolvedValue({
      jobId: 'j1',
      status: 'COMPLETED',
      stage: 'DONE',
      round: 1,
      safeErrorCode: null,
      review: {
        draftHash: ORIGINAL_HASH,
        authorConsensus: false,
        authorAgreementPercent: 33,
        ready: true,
        reasons: [],
      },
      draft: { markdown: '# Original', citations: [], judgeScore: 8, criticScore: 7 },
    }),
  };
  return new PublicationLifecycleService(
    repository as never,
    generation as never,
    { notifyPublished: vi.fn() } as never,
    new GenerationStartGate(),
  );
}

describe('generation-state after a passing edit', () => {
  it('returns the latest approved revision draft and hash', async () => {
    const state = await build({
      markdown: '# Edited',
      citations: [{ evidenceId: 'e1', url: 'https://example.com' }],
      contentHash: EDIT_HASH,
      judgeScore: 9,
      criticScore: null,
    }).getGenerationState('p1', 'o1');

    expect(state).toMatchObject({
      draft: {
        markdown: '# Edited',
        citations: [{ evidenceId: 'e1', url: 'https://example.com' }],
        judgeScore: 9,
        criticScore: 7,
      },
      review: { draftHash: EDIT_HASH },
    });
  });

  it('keeps the generated draft and hash when no revision is publishable', async () => {
    const state = await build(null).getGenerationState('p1', 'o1');

    expect(state).toMatchObject({
      draft: { markdown: '# Original' },
      review: { draftHash: ORIGINAL_HASH },
    });
  });
});
