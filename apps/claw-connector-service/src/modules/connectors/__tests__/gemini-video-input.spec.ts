import { vi } from 'vitest';
import { GeminiAdapter } from '../managers/adapters/gemini.adapter';

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn().mockReturnValue({ ENCRYPTION_KEY: 'a'.repeat(64) }) },
}));

const config = { provider: 'GEMINI', apiKey: 'g-key', baseUrl: undefined, region: undefined };

const respond = (body: unknown): { ok: boolean; status: number; text: () => Promise<string> } => ({
  ok: true,
  status: 200,
  text: () => Promise.resolve(JSON.stringify(body)),
});

describe('GeminiAdapter supportsVideoInput', () => {
  it('sets the flag from the video heuristic, per model, on the prefixed catalog id', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        respond({
          object: 'list',
          data: [
            { id: 'models/gemini-2.5-flash', object: 'model' },
            { id: 'models/gemini-2.5-flash-image', object: 'model' },
            { id: 'models/gemini-2.5-flash-preview-tts', object: 'model' },
            { id: 'models/text-embedding-004', object: 'model' },
          ],
        }),
      )
      .mockResolvedValueOnce(respond({ models: [] }));

    const models = await new GeminiAdapter().syncModels(config);
    const flag = (key: string): boolean | undefined =>
      models.find((m) => m.modelKey === key)?.capabilities.supportsVideoInput;

    expect(flag('models/gemini-2.5-flash')).toBe(true);
    expect(flag('models/gemini-2.5-flash-image')).toBe(false);
    expect(flag('models/gemini-2.5-flash-preview-tts')).toBe(false);
    expect(flag('models/text-embedding-004')).toBe(false);
  });
});
