import { ResearchClient } from '../research.client';
import { AppConfig } from '../../../app/config/app.config';

describe('ResearchClient', () => {
  beforeEach(() => {
    vi.stubEnv('THREAD_GENERATION_DATABASE_URL', 'postgresql://claw:secret@localhost:5432/db');
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(40));
    vi.stubEnv('RESEARCH_SERVICE_URL', 'http://research-service:4016');
    AppConfig.validate();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns a versioned hash of the persisted research bundle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'run-1', status: 'COMPLETED', bundle: { items: [] } }), {
          status: 200,
        }),
      ),
    );

    const result = await new ResearchClient().run('owner-1', 'Explain this topic', 'corr-1');

    expect(result).toMatchObject({ researchRunId: 'run-1', bundle: { items: [] }, version: 1 });
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('does not accept an incomplete evidence response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));

    await expect(
      new ResearchClient().run('owner-1', 'Explain this topic', 'corr-1'),
    ).rejects.toThrow('Research evidence response is invalid');
  });
});
