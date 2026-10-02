import { vi } from 'vitest';
import { OpenAIAdapter } from '../managers/adapters/openai.adapter';

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn().mockReturnValue({ ENCRYPTION_KEY: 'a'.repeat(64) }) },
}));

const config = { provider: 'OPENAI', apiKey: 'sk-test', baseUrl: undefined, region: undefined };

function mockListing(ids: string[]): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () =>
      Promise.resolve(
        JSON.stringify({ object: 'list', data: ids.map((id) => ({ id, object: 'model' })) }),
      ),
  });
}

describe('OpenAIAdapter retired models (ADR-151)', () => {
  it('records models OpenAI lists but no longer serves as SUNSET, the rest ACTIVE', async () => {
    mockListing(['gpt-4o-mini', 'gpt-5-chat-latest', 'gpt-4o-search-preview', 'gpt-5.1-codex']);

    const models = await new OpenAIAdapter().syncModels(config);
    const lifecycle = (key: string) => models.find((m) => m.modelKey === key)?.lifecycle;

    expect(lifecycle('gpt-4o-mini')).toBe('ACTIVE');
    expect(lifecycle('gpt-5-chat-latest')).toBe('SUNSET');
    expect(lifecycle('gpt-4o-search-preview')).toBe('SUNSET');
    expect(lifecycle('gpt-5.1-codex')).toBe('SUNSET');
  });
});

describe('OpenAIAdapter media capability flags', () => {
  it('marks gpt-5 / o-series as vision and speech models as not', async () => {
    mockListing(['gpt-5', 'o3', 'o4-mini', 'gpt-4o-transcribe', 'gpt-3.5-turbo', 'whisper-1']);

    const models = await new OpenAIAdapter().syncModels(config);
    const caps = (key: string) => models.find((m) => m.modelKey === key)?.capabilities;

    // whisper-1 is not a chat model and never reaches the catalog.
    expect(models.map((m) => m.modelKey)).not.toContain('whisper-1');
    expect(caps('gpt-5')?.supportsVision).toBe(true);
    expect(caps('o3')?.supportsVision).toBe(true);
    expect(caps('o4-mini')?.supportsVision).toBe(true);
    expect(caps('gpt-4o-transcribe')?.supportsVision).toBe(false);
    expect(caps('gpt-3.5-turbo')?.supportsVision).toBe(false);
  });

  it('flags audio per model when the listing has an audio-input model', async () => {
    mockListing(['gpt-5', 'gpt-4o-transcribe']);

    const models = await new OpenAIAdapter().syncModels(config);
    const caps = (key: string) => models.find((m) => m.modelKey === key)?.capabilities;

    expect(caps('gpt-5')?.supportsAudio).toBe(false);
    expect(caps('gpt-4o-transcribe')?.supportsAudio).toBe(true);
  });

  // file-service needs one OpenAI row flagged audio to keep OpenAI as a
  // transcription fallback (it calls whisper-1 itself).
  it('keeps an OpenAI audio candidate when the listing has no audio-input model', async () => {
    mockListing(['gpt-5', 'o3']);

    const models = await new OpenAIAdapter().syncModels(config);

    expect(models.some((m) => m.capabilities.supportsAudio)).toBe(true);
  });

  it('never claims native video input', async () => {
    mockListing(['gpt-5', 'gpt-4o']);

    const models = await new OpenAIAdapter().syncModels(config);

    expect(models.every((m) => !m.capabilities.supportsVideoInput)).toBe(true);
  });
});

describe('OpenAIAdapter responses-only classification', () => {
  it('syncs *-pro and *-codex as TOOL and ordinary models as CHAT', async () => {
    mockListing(['gpt-5', 'gpt-5-pro', 'o1-pro-2025-03-19', 'gpt-5.3-codex', 'gpt-4o-mini']);

    const models = await new OpenAIAdapter().syncModels(config);
    const kind = (key: string) => models.find((m) => m.modelKey === key)?.kind;

    expect(kind('gpt-5')).toBe('CHAT');
    expect(kind('gpt-4o-mini')).toBe('CHAT');
    expect(kind('gpt-5-pro')).toBe('TOOL');
    expect(kind('o1-pro-2025-03-19')).toBe('TOOL');
    expect(kind('gpt-5.3-codex')).toBe('TOOL');
  });
});
