import { vi } from 'vitest';

import { MediaCapabilityState } from '../../../../common/enums/media-capability-state.enum';
import { ModelCapabilityClient } from '../model-capability.client';

const { appConfigGet, httpRequest } = vi.hoisted(() => ({
  appConfigGet: vi.fn(),
  httpRequest: vi.fn(),
}));

vi.mock('@claw/shared-utilities', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  httpRequest,
}));
vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: vi.fn(() => 'Service t'),
}));
vi.mock('../../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

const snapshot = {
  generatedAt: '2026-09-25T00:00:00.000Z',
  models: [
    {
      provider: 'GEMINI',
      modelKey: 'models/gemini-2.5-flash',
      modalitiesIn: ['TEXT', 'IMAGE_INPUT', 'AUDIO', 'VIDEO_INPUT'],
      exposure: 'EXPOSED',
      kind: 'CHAT',
    },
    {
      provider: 'DEEPSEEK',
      modelKey: 'deepseek-chat',
      modalitiesIn: ['TEXT'],
      exposure: 'EXPOSED',
      kind: 'CHAT',
    },
    {
      provider: 'GEMINI',
      modelKey: 'models/gemini-2.5-pro',
      modalitiesIn: ['TEXT', 'IMAGE_INPUT', 'VIDEO_INPUT'],
      exposure: 'HIDDEN',
      kind: 'CHAT',
    },
  ],
};

describe('ModelCapabilityClient', () => {
  beforeEach(() => {
    ModelCapabilityClient.invalidate();
    httpRequest.mockReset();
    appConfigGet.mockReturnValue({ CONNECTOR_SERVICE_URL: 'http://connector:4003' });
  });

  it('reads the connector snapshot and resolves each modality for a hit', async () => {
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: snapshot });

    const capabilities = await new ModelCapabilityClient().resolve('GEMINI', 'gemini-2.5-flash');

    expect(capabilities).toEqual({
      vision: MediaCapabilityState.SUPPORTED,
      audioInput: MediaCapabilityState.SUPPORTED,
      videoInput: MediaCapabilityState.SUPPORTED,
    });
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://connector:4003/api/v1/internal/connectors/models-snapshot',
        timeoutMs: expect.any(Number),
      }),
    );
  });

  it('matches the catalog id with or without the models/ prefix, case-insensitively', async () => {
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: snapshot });
    const client = new ModelCapabilityClient();

    const bare = await client.resolve('gemini', 'Gemini-2.5-Flash');
    const prefixed = await client.resolve('GEMINI', 'models/gemini-2.5-flash');

    expect(bare).toEqual(prefixed);
    expect(bare.vision).toBe(MediaCapabilityState.SUPPORTED);
  });

  it('reports a text-only model as UNSUPPORTED, not UNKNOWN', async () => {
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: snapshot });

    const capabilities = await new ModelCapabilityClient().resolve('DEEPSEEK', 'deepseek-chat');

    expect(capabilities.vision).toBe(MediaCapabilityState.UNSUPPORTED);
    expect(capabilities.videoInput).toBe(MediaCapabilityState.UNSUPPORTED);
  });

  it('serves repeat lookups from one cached snapshot', async () => {
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: snapshot });
    const client = new ModelCapabilityClient();

    await client.resolve('GEMINI', 'gemini-2.5-flash');
    await client.resolve('DEEPSEEK', 'deepseek-chat');
    await new ModelCapabilityClient().resolve('OPENAI', 'gpt-4o');

    expect(httpRequest).toHaveBeenCalledTimes(1);
  });

  it('resolves UNKNOWN (never throws) when the connector times out', async () => {
    httpRequest.mockRejectedValue(new Error('The operation was aborted due to timeout'));

    const capabilities = await new ModelCapabilityClient().resolve('OPENAI', 'gpt-4o');

    expect(capabilities).toEqual({
      vision: MediaCapabilityState.UNKNOWN,
      audioInput: MediaCapabilityState.UNKNOWN,
      videoInput: MediaCapabilityState.UNKNOWN,
    });
  });

  it('resolves UNKNOWN on a non-2xx answer and on a malformed body', async () => {
    httpRequest.mockResolvedValueOnce({ ok: false, status: 503, data: null });
    expect((await new ModelCapabilityClient().resolve('OPENAI', 'gpt-4o')).vision).toBe(
      MediaCapabilityState.UNKNOWN,
    );

    ModelCapabilityClient.invalidate();
    httpRequest.mockResolvedValueOnce({ ok: true, status: 200, data: { models: 'nope' } });
    expect((await new ModelCapabilityClient().resolve('OPENAI', 'gpt-4o')).vision).toBe(
      MediaCapabilityState.UNKNOWN,
    );
  });

  it('resolves a cloud model the catalog has no row for as UNKNOWN', async () => {
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: snapshot });

    const capabilities = await new ModelCapabilityClient().resolve('OPENAI', 'gpt-9');

    expect(capabilities.vision).toBe(MediaCapabilityState.UNKNOWN);
  });

  it('classifies a local model the catalog lacks by the local vision heuristic', async () => {
    httpRequest.mockRejectedValue(new Error('connector down'));
    const client = new ModelCapabilityClient();

    expect((await client.resolve('local-ollama', 'llava:7b')).vision).toBe(
      MediaCapabilityState.SUPPORTED,
    );
    expect((await client.resolve('local-ollama', 'llama3.1:8b')).vision).toBe(
      MediaCapabilityState.UNSUPPORTED,
    );
    // An unresolved local id names no model, so it cannot be classified.
    expect((await client.resolve('local-ollama', 'auto')).vision).toBe(
      MediaCapabilityState.UNKNOWN,
    );
  });

  it('lists only exposed chat models that accept video, in bare id form', async () => {
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: snapshot });

    expect(await new ModelCapabilityClient().listVideoCapableModels()).toEqual([
      { provider: 'GEMINI', model: 'gemini-2.5-flash' },
    ]);
  });

  it('lists null, not an empty list, when the snapshot is unavailable', async () => {
    httpRequest.mockRejectedValue(new Error('connector down'));

    expect(await new ModelCapabilityClient().listVideoCapableModels()).toBeNull();
  });
});
