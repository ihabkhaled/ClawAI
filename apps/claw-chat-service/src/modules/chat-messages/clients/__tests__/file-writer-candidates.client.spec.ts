import { vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { httpRequest } from '../../../../common/utilities';
import { FileWriterCandidatesClient } from '../file-writer-candidates.client';

vi.mock('../../../../common/utilities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../common/utilities')>()),
  httpRequest: vi.fn(),
}));
const mocked = vi.mocked(httpRequest);
const LIST = [
  { provider: 'OLLAMA_CLOUD', modelAlias: 'gpt-oss:120b', timeoutMs: 1, maxTokens: 8192 },
];

describe('FileWriterCandidatesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      ROUTING_SERVICE_URL: 'http://routing.test',
      INTER_SERVICE_AUTH_TOKEN: 't'.repeat(40),
    } as never);
  });

  it('reads the FILE_WRITER role with the service token', async () => {
    mocked.mockResolvedValue({ ok: true, status: 200, data: LIST } as never);
    await expect(new FileWriterCandidatesClient().resolve()).resolves.toEqual(LIST);
    expect(mocked).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://routing.test/api/v1/internal/assistant-models/FILE_WRITER/candidates',
        headers: { Authorization: `Service ${'t'.repeat(40)}` },
      }),
    );
  });

  it('reuses the list for a minute and keeps it through an outage', async () => {
    const client = new FileWriterCandidatesClient();
    let now = 0;
    mocked.mockResolvedValueOnce({ ok: true, status: 200, data: LIST } as never);
    await client.resolve(() => now);
    now = 30_000;
    await client.resolve(() => now);
    expect(mocked).toHaveBeenCalledTimes(1);

    now = 120_000;
    mocked.mockRejectedValueOnce(new Error('fetch failed'));
    await expect(client.resolve(() => now)).resolves.toEqual(LIST);
  });

  it('returns an empty list when routing-service was never reachable', async () => {
    mocked.mockRejectedValue(new Error('fetch failed'));
    await expect(new FileWriterCandidatesClient().resolve()).resolves.toEqual([]);
  });
});
