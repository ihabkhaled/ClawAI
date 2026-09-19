import { vi } from 'vitest';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import { ExposedModelsService } from '../services/exposed-models.service';

vi.mock('../../../common/utilities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../common/utilities')>()),
  httpRequest: vi.fn(),
}));

const mocked = vi.mocked(httpRequest);

const snapshot = {
  ok: true,
  status: 200,
  data: {
    models: [
      {
        provider: 'GEMINI',
        modelKey: 'models/gemini-3.6-flash',
        exposure: 'EXPOSED',
        kind: 'CHAT',
      },
      { provider: 'OPENAI', modelKey: 'gpt-5.5', exposure: 'EXPOSED', kind: 'CHAT' },
      { provider: 'OPENAI', modelKey: 'gpt-image-2', exposure: 'EXPOSED', kind: 'IMAGE' },
      { provider: 'OPENAI', modelKey: 'gpt-4o-mini', exposure: 'UNEXPOSED', kind: 'CHAT' },
    ],
  },
};

describe('ExposedModelsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      CONNECTOR_SERVICE_URL: 'http://connector.test',
    } as never);
  });

  it('keeps exposed chat models only', async () => {
    mocked.mockResolvedValueOnce(snapshot as never);

    const keys = await new ExposedModelsService().exposedChatModels();

    expect([...(keys ?? [])].sort()).toEqual(['GEMINI/gemini-3.6-flash', 'OPENAI/gpt-5.5']);
  });

  // An admin exposing a model must reach the router within a minute, no restart.
  it('reuses the list for a minute, then reads it again', async () => {
    mocked.mockResolvedValue(snapshot as never);
    const service = new ExposedModelsService();
    let now = 1_000;

    await service.exposedChatModels(() => now);
    now += 30_000;
    await service.exposedChatModels(() => now);
    expect(mocked).toHaveBeenCalledTimes(1);

    now += 31_000;
    await service.exposedChatModels(() => now);
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it('returns null when connector-service cannot be read and nothing is cached', async () => {
    mocked.mockRejectedValueOnce(new Error('fetch failed'));

    await expect(new ExposedModelsService().exposedChatModels()).resolves.toBeNull();
  });

  it('keeps the last good list through a connector-service outage', async () => {
    const service = new ExposedModelsService();
    let now = 0;
    mocked.mockResolvedValueOnce(snapshot as never);
    await service.exposedChatModels(() => now);

    now += 120_000;
    mocked.mockResolvedValueOnce({ ok: false, status: 503, data: {} } as never);
    const keys = await service.exposedChatModels(() => now);

    expect(keys?.size).toBe(2);
  });
});
