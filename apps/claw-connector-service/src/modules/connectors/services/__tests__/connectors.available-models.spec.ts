import { describe, expect, it, vi } from 'vitest';
import { ConnectorsService } from '../connectors.service';

function row(provider: string, modelKey: string, kind: 'CHAT' | 'AUDIO') {
  return {
    provider,
    modelKey,
    displayName: modelKey,
    kind,
    connector: {
      status: 'ACTIVE',
      isEnabled: true,
      providerDefinition: { key: provider, displayName: provider, adapterFamily: 'x' },
    },
  };
}

function build(rows: unknown[]): { service: ConnectorsService; find: ReturnType<typeof vi.fn> } {
  const find = vi.fn().mockResolvedValue(rows);
  const service = Object.create(ConnectorsService.prototype) as ConnectorsService;
  Object.assign(service, {
    connectorModelsRepository: { findExposedForCatalog: find },
    logger: { debug: vi.fn() },
  });
  return { service, find };
}

describe('ConnectorsService.getAvailableModels media rows', () => {
  it('asks for audio rows, keeps audio-OUTPUT ones and drops input-only audio models', async () => {
    const { service, find } = build([
      row('OPENAI', 'gpt-4o', 'CHAT'),
      row('OPENAI', 'gpt-4o-mini-tts', 'AUDIO'),
      row('GEMINI', 'lyria-3.5', 'AUDIO'),
      row('OPENAI', 'whisper-1', 'AUDIO'),
      row('OPENAI', 'gpt-realtime', 'AUDIO'),
    ]);

    const result = await service.getAvailableModels();

    expect(find).toHaveBeenCalledWith(true);
    expect(result.map((m) => m.modelKey)).toEqual(['gpt-4o', 'gpt-4o-mini-tts', 'lyria-3.5']);
  });

  it('types media models and leaves chat models as TEXT, keeping kind for older clients', async () => {
    const { service } = build([
      row('GROK', 'grok-imagine-image', 'CHAT'),
      row('GEMINI', 'veo-3.1-fast-generate-preview', 'CHAT'),
      row('GEMINI', 'lyria-3.5', 'AUDIO'),
      row('OPENAI', 'gpt-4o-mini-tts', 'AUDIO'),
      row('OPENAI', 'gpt-4o', 'CHAT'),
    ]);

    const byKey = new Map((await service.getAvailableModels()).map((m) => [m.modelKey, m]));

    expect(byKey.get('grok-imagine-image')).toMatchObject({
      mediaKind: 'IMAGE',
      modalitiesOut: ['IMAGE_OUTPUT'],
      kind: 'CHAT',
    });
    expect(byKey.get('veo-3.1-fast-generate-preview')).toMatchObject({ mediaKind: 'VIDEO' });
    expect(byKey.get('lyria-3.5')).toMatchObject({ mediaKind: 'AUDIO', audioKind: 'MUSIC' });
    expect(byKey.get('gpt-4o-mini-tts')).toMatchObject({ mediaKind: 'AUDIO', audioKind: 'SPEECH' });
    expect(byKey.get('gpt-4o')).toMatchObject({ modalitiesOut: ['TEXT'] });
    expect(byKey.get('gpt-4o')?.mediaKind).toBeUndefined();
  });
});
