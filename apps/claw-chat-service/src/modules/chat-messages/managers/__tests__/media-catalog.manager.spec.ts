import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaKind } from '../../enums/media-kind.enum';
import type { AccessControlService } from '../../services/access-control.service';
import { MediaCatalogManager } from '../media-catalog.manager';

const net = vi.hoisted(() => ({ httpRequest: vi.fn() }));
vi.mock('@claw/shared-utilities', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  httpRequest: net.httpRequest,
}));
vi.mock('../../../../common/utilities', () => ({ buildInterServiceAuthHeader: () => 'Bearer t' }));
vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ CONNECTOR_SERVICE_URL: 'http://connector:4003' }) },
}));

const costs = vi.hoisted(() => ({ getCostClasses: vi.fn() }));
vi.mock('../../clients/model-exposure.client', () => ({
  ModelExposureClient: vi.fn(function () {
    return { getCostClasses: costs.getCostClasses };
  }),
}));

type Row = {
  provider: string;
  modelKey: string;
  mediaKind?: string;
  audioKind?: string;
  exposure?: string;
};
const ROWS: Row[] = [
  { provider: 'OPENAI', modelKey: 'chatgpt-image-latest', mediaKind: 'IMAGE' },
  { provider: 'OPENAI', modelKey: 'gpt-image-1', mediaKind: 'IMAGE' },
  { provider: 'GROK', modelKey: 'grok-imagine-image', mediaKind: 'IMAGE' },
  { provider: 'GEMINI', modelKey: 'models/gemini-2.5-flash-image', mediaKind: 'IMAGE' },
  { provider: 'GEMINI', modelKey: 'imagen-hidden', mediaKind: 'IMAGE', exposure: 'HIDDEN' },
  { provider: 'GEMINI', modelKey: 'veo-3.1-fast', mediaKind: 'VIDEO' },
  { provider: 'GROK', modelKey: 'grok-imagine-video', mediaKind: 'VIDEO' },
  { provider: 'OPENAI', modelKey: 'gpt-4o-mini-tts', mediaKind: 'AUDIO', audioKind: 'SPEECH' },
  { provider: 'OPENAI', modelKey: 'tts-1', mediaKind: 'AUDIO', audioKind: 'SPEECH' },
  { provider: 'GEMINI', modelKey: 'lyria-2', mediaKind: 'AUDIO', audioKind: 'MUSIC' },
  { provider: 'OPENAI', modelKey: 'gpt-4o', kind: 'CHAT' } as Row,
];

function build(options: { denied?: string[]; classes?: Record<string, string> } = {}) {
  const accessControl = {
    listModelAccess: vi.fn(
      async (_user: string, pairs: Array<{ provider: string; model: string }>) =>
        pairs.map((pair) => ({
          ...pair,
          allowed: !(options.denied ?? []).includes(pair.model),
        })),
    ),
  } as unknown as AccessControlService;
  costs.getCostClasses.mockImplementation(
    async (pairs: Array<{ provider: string; model: string }>) =>
      new Map(
        pairs.map((pair) => [
          JSON.stringify([pair.provider, pair.model]),
          options.classes?.[pair.model] ?? null,
        ]),
      ),
  );
  return { manager: new MediaCatalogManager(accessControl), accessControl };
}

const provide = (rows: Row[] = ROWS) =>
  net.httpRequest.mockResolvedValue({ ok: true, status: 200, data: { models: rows } });

describe('MediaCatalogManager', () => {
  beforeEach(() => {
    net.httpRequest.mockReset();
    costs.getCostClasses.mockReset();
  });

  it('builds one candidate per provider from the catalog, in the provider order of the kind', async () => {
    provide();
    const { manager } = build();
    expect(await manager.candidates('u1', MediaKind.IMAGE)).toEqual([
      { provider: 'IMAGE_GEMINI', model: 'gemini-2.5-flash-image' },
      { provider: 'IMAGE_OPENAI', model: 'chatgpt-image-latest' },
      { provider: 'IMAGE_GROK', model: 'grok-imagine-image' },
    ]);
    expect(await manager.candidates('u2', MediaKind.VIDEO)).toEqual([
      { provider: 'VIDEO_GEMINI', model: 'veo-3.1-fast' },
      { provider: 'VIDEO_GROK', model: 'grok-imagine-video' },
    ]);
    expect(await manager.candidates('u3', MediaKind.AUDIO, 'SPEECH')).toEqual([
      { provider: 'AUDIO_OPENAI', model: 'gpt-4o-mini-tts' },
    ]);
  });

  it('never offers a model the catalog does not list: gpt-image-1 and tts-1 only if exposed, cheapest first', async () => {
    provide();
    const { manager } = build({
      classes: { 'gpt-image-1': 'CHEAP', 'chatgpt-image-latest': 'PREMIUM' },
    });
    const image = await manager.candidates('u1', MediaKind.IMAGE);
    expect(image?.find((t) => t.provider === 'IMAGE_OPENAI')?.model).toBe('gpt-image-1');
  });

  it('skips models the plan does not allow and models that are not exposed', async () => {
    provide();
    const { manager } = build({ denied: ['chatgpt-image-latest', 'gpt-image-1'] });
    const image = await manager.candidates('u1', MediaKind.IMAGE);
    expect(image?.map((t) => t.provider)).toEqual(['IMAGE_GEMINI', 'IMAGE_GROK']);
    expect(image?.some((t) => t.model === 'imagen-hidden')).toBe(false);
  });

  it('never lists a local provider', async () => {
    provide([...ROWS, { provider: 'LOCAL', modelKey: 'sdxl-turbo', mediaKind: 'IMAGE' }]);
    const { manager } = build();
    const image = await manager.candidates('u1', MediaKind.IMAGE);
    expect(image?.some((t) => t.provider.includes('LOCAL'))).toBe(false);
  });

  it('keeps speech and music apart for audio', async () => {
    provide();
    const { manager } = build();
    expect(await manager.candidates('u1', MediaKind.AUDIO, 'MUSIC')).toEqual([
      { provider: 'AUDIO_GEMINI', model: 'lyria-2' },
    ]);
  });

  it('caches for 60 seconds per user and kind', async () => {
    provide();
    const { manager, accessControl } = build();
    await manager.candidates('u1', MediaKind.IMAGE);
    await manager.candidates('u1', MediaKind.IMAGE);
    expect(net.httpRequest).toHaveBeenCalledTimes(1);
    expect(accessControl.listModelAccess).toHaveBeenCalledTimes(1);
    await manager.candidates('u2', MediaKind.IMAGE);
    expect(accessControl.listModelAccess).toHaveBeenCalledTimes(2);
  });

  it('answers null when the catalog call fails, so the caller falls back to its constants', async () => {
    net.httpRequest.mockResolvedValue({ ok: false, status: 502, data: {} });
    const { manager } = build();
    expect(await manager.candidates('u1', MediaKind.IMAGE)).toBeNull();
  });

  it('answers an empty list when the catalog works but offers nothing of the kind', async () => {
    provide([ROWS[0] as Row]);
    const { manager } = build();
    expect(await manager.candidates('u1', MediaKind.VIDEO)).toEqual([]);
  });

  it('finds a model the user named, with its provider, when the plan allows it', async () => {
    provide();
    const { manager } = build();
    expect(await manager.findNamed('u1', MediaKind.AUDIO, 'GPT-4o-mini-TTS')).toEqual({
      status: 'found',
      target: { provider: 'AUDIO_OPENAI', model: 'gpt-4o-mini-tts' },
    });
    expect(await manager.findNamed('u1', MediaKind.IMAGE, 'gemini-2.5-flash-image')).toEqual({
      status: 'found',
      target: { provider: 'IMAGE_GEMINI', model: 'gemini-2.5-flash-image' },
    });
  });

  it('refuses a named model the plan does not allow, with the same access call as the candidates', async () => {
    provide();
    const { manager, accessControl } = build({ denied: ['chatgpt-image-latest'] });
    expect(await manager.findNamed('u1', MediaKind.IMAGE, 'chatgpt-image-latest')).toEqual({
      status: 'denied',
    });
    expect(accessControl.listModelAccess).toHaveBeenCalledWith('u1', [
      { provider: 'OPENAI', model: 'chatgpt-image-latest' },
    ]);
  });

  it('reports an unlisted name as unknown, and refuses when the plan lookup fails', async () => {
    provide();
    const { manager } = build();
    expect(await manager.findNamed('u1', MediaKind.IMAGE, 'made-up')).toEqual({
      status: 'unknown',
    });
    const failing = new MediaCatalogManager({
      listModelAccess: async (): Promise<never> => {
        throw new Error('down');
      },
    } as unknown as AccessControlService);
    expect(await failing.isAllowed('u1', 'OPENAI', 'x')).toBe(false);
  });

  it('the unnamed candidate list is filtered by the same plan access', async () => {
    provide();
    const { manager, accessControl } = build({ denied: ['grok-imagine-image', 'gpt-image-1'] });
    const image = await manager.candidates('u1', MediaKind.IMAGE);
    expect(image?.map((t) => t.provider)).toEqual(['IMAGE_GEMINI', 'IMAGE_OPENAI']);
    expect(image?.some((t) => t.model === 'grok-imagine-image')).toBe(false);
    expect(accessControl.listModelAccess).toHaveBeenCalledTimes(1);
  });
});
