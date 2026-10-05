import { AppConfig } from '../../../../app/config/app.config';
import { ThreadsGenerationClient } from '../threads-generation.client';

describe('ThreadsGenerationClient', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'j'.repeat(32));
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://threads:secret@localhost:5432/threads');
    vi.stubEnv('THREAD_GENERATION_SERVICE_URL', 'https://thread-generation-service:4020');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(32));
    AppConfig.validate();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends the owner-selected cap and exact candidate to the internal review queue', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'review-job', status: 'QUEUED' }),
    });
    vi.stubGlobal('fetch', fetch);
    const client = new ThreadsGenerationClient();

    await expect(
      client.enqueueRevisionReview('owner-1', {
        parentJobId: 'generation-job',
        idempotencyKey: 'edit-key',
        correlationId: 'edit-correlation',
        spendCapMicroUsd: '2500000',
        draft: {
          markdown: '# Edited article',
          citations: [{ evidenceId: 'source-1', url: 'https://example.test/source' }],
        },
      }),
    ).resolves.toEqual({ jobId: 'review-job', status: 'QUEUED' });
    expect(fetch).toHaveBeenCalledWith(
      'https://thread-generation-service:4020/api/v1/internal/threads/generations/revision-reviews',
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        body: expect.stringContaining('"spendCapMicroUsd":"2500000"'),
      }),
    );
  });
});
