import { vi } from 'vitest';
import { GeminiAdapter } from '../managers/adapters/gemini.adapter';
import {
  geminiNativeBaseUrl,
  withKnownContextWindows,
} from '../utilities/model-context-window.utility';

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn().mockReturnValue({ ENCRYPTION_KEY: 'a'.repeat(64) }) },
}));

const config = { provider: 'GEMINI', apiKey: 'g-key', baseUrl: undefined, region: undefined };

const respond = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  text: () => Promise.resolve(JSON.stringify(body)),
});

describe('GeminiAdapter context windows', () => {
  // The OpenAI-compatible list has no limits; before this every Gemini model
  // reached chat-service unknown and was budgeted as a 32k model.
  it('reads real input limits from the native model list', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        respond({ object: 'list', data: [{ id: 'models/gemini-3.6-flash', object: 'model' }] }),
      )
      .mockResolvedValueOnce(
        respond({ models: [{ name: 'models/gemini-3.6-flash', inputTokenLimit: 1_048_576 }] }),
      );
    global.fetch = fetchMock;

    const models = await new GeminiAdapter().syncModels(config);

    expect(models[0]?.capabilities.maxContextTokens).toBe(1_048_576);
    // The request-URL guard hands fetch the PARSED url, so the assertion
    // compares its string form rather than the value passed in.
    const nativeCall = fetchMock.mock.calls[1] as [URL, { headers: Record<string, string> }];
    expect(String(nativeCall[0])).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',
    );
    expect(nativeCall[1].headers['x-goog-api-key']).toBe('g-key');
  });

  // ADR-125: Google's native Model resource publishes `outputTokenLimit`
  // ("Maximum number of output tokens available for this model",
  // ai.google.dev/api/models). The sync stores it as the authoritative
  // catalog ceiling; the learned column stays separate and only lowers.
  it('reads the published output ceiling from the same native list (real Model shape)', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        respond({
          object: 'list',
          data: [
            { id: 'models/gemini-2.5-flash', object: 'model', owned_by: 'google' },
            { id: 'models/gemini-embedding-001', object: 'model', owned_by: 'google' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        respond({
          models: [
            {
              name: 'models/gemini-2.5-flash',
              version: '001',
              displayName: 'Gemini 2.5 Flash',
              description: 'Stable version of Gemini 2.5 Flash',
              inputTokenLimit: 1_048_576,
              outputTokenLimit: 65_536,
              supportedGenerationMethods: ['generateContent', 'countTokens'],
              temperature: 1,
              topP: 0.95,
              topK: 64,
              maxTemperature: 2,
              thinking: true,
            },
            {
              name: 'models/gemini-embedding-001',
              version: '001',
              inputTokenLimit: 2048,
              outputTokenLimit: 1,
              supportedGenerationMethods: ['embedContent'],
            },
          ],
          nextPageToken: '',
        }),
      );

    const models = await new GeminiAdapter().syncModels(config);

    const flash = models.find((m) => m.modelKey === 'models/gemini-2.5-flash');
    expect(flash?.capabilities.maxContextTokens).toBe(1_048_576);
    expect(flash?.capabilities.maxOutputTokens).toBe(65_536);
    // Google's own number, even when tiny: an embedding model outputs a vector.
    const embedding = models.find((m) => m.modelKey === 'models/gemini-embedding-001');
    expect(embedding?.capabilities.maxOutputTokens).toBe(1);
  });

  it.each([
    ['missing', {}],
    ['zero', { outputTokenLimit: 0 }],
    ['negative', { outputTokenLimit: -5 }],
    ['non-integer', { outputTokenLimit: 8191.5 }],
    ['a string', { outputTokenLimit: '8192' }],
  ])('leaves the output ceiling unknown when outputTokenLimit is %s', async (_label, extra) => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        respond({ object: 'list', data: [{ id: 'models/gemini-3.6-flash', object: 'model' }] }),
      )
      .mockResolvedValueOnce(
        respond({
          models: [{ name: 'models/gemini-3.6-flash', inputTokenLimit: 1_048_576, ...extra }],
        }),
      );

    const models = await new GeminiAdapter().syncModels(config);

    expect(models[0]?.capabilities.maxContextTokens).toBe(1_048_576);
    expect(models[0]?.capabilities).not.toHaveProperty('maxOutputTokens');
  });

  it('still syncs when the native list fails, just without limits', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        respond({ object: 'list', data: [{ id: 'models/gemini-3.6-flash', object: 'model' }] }),
      )
      .mockResolvedValueOnce(respond({ error: 'nope' }, false, 403));

    const models = await new GeminiAdapter().syncModels(config);

    expect(models).toHaveLength(1);
    expect(models[0]?.capabilities.maxContextTokens).toBeUndefined();
    expect(models[0]?.capabilities.maxOutputTokens).toBeUndefined();
  });

  // Live bug this guards against: syncModels used to hardcode
  // `supportsAudio: true` for every Gemini model, regardless of the model —
  // Gemini's own /models list carries no modality data to sync from. The
  // catalog then routed audio to a model that Gemini itself refuses.
  it('does not mark a preview model as audio-capable just because it came from Gemini', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        respond({
          object: 'list',
          data: [
            { id: 'models/antigravity-preview-05-2026', object: 'model' },
            { id: 'models/gemini-2.5-flash', object: 'model' },
          ],
        }),
      )
      .mockResolvedValueOnce(respond({ models: [] }));

    const models = await new GeminiAdapter().syncModels(config);

    const antigravity = models.find((m) => m.modelKey === 'models/antigravity-preview-05-2026');
    const flash = models.find((m) => m.modelKey === 'models/gemini-2.5-flash');
    expect(antigravity?.capabilities.supportsAudio).toBe(false);
    expect(flash?.capabilities.supportsAudio).toBe(true);
  });
});

describe('known context windows', () => {
  it('fills a missing window from the shared table', () => {
    const [model] = withKnownContextWindows('OPENAI', [
      {
        modelKey: 'gpt-4o-mini',
        displayName: 'x',
        lifecycle: 'ACTIVE',
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: true,
          supportsAudio: false,
          supportsStructuredOutput: true,
        },
      } as never,
    ]);

    expect(model?.capabilities.maxContextTokens).toBe(128_000);
  });

  it('never overwrites a window the provider reported', () => {
    const [model] = withKnownContextWindows('GEMINI', [
      {
        modelKey: 'models/gemini-3.6-flash',
        displayName: 'x',
        lifecycle: 'ACTIVE',
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: true,
          supportsAudio: false,
          supportsStructuredOutput: true,
          maxContextTokens: 2_000_000,
        },
      } as never,
    ]);

    expect(model?.capabilities.maxContextTokens).toBe(2_000_000);
  });

  it('maps the OpenAI-compatible base to the native one', () => {
    expect(geminiNativeBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai/')).toBe(
      'https://generativelanguage.googleapis.com/v1beta',
    );
  });
});
