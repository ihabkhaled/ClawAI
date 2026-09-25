import { vi } from 'vitest';
import { type ConnectorModelsRepository } from '../../repositories/connector-models.repository';
import { ModelsSnapshotManager } from '../models-snapshot.manager';

type Row = {
  provider: string;
  modelKey: string;
  displayName: string;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsVideoInput: boolean;
  maxContextTokens: number | null;
  maxOutputTokens?: number | null;
  learnedMaxOutputTokens?: number | null;
  exposure: string;
  kind: string;
};

function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    provider: 'OPENAI',
    modelKey: 'gpt-4o',
    displayName: 'GPT-4o',
    supportsVision: false,
    supportsAudio: false,
    supportsVideoInput: false,
    maxContextTokens: 128_000,
    exposure: 'UNEXPOSED',
    kind: 'CHAT',
    ...overrides,
  };
}

describe('ModelsSnapshotManager', () => {
  function buildManager(rows: Row[]): ModelsSnapshotManager {
    const repo = {
      findAllForSnapshot: vi.fn().mockResolvedValue(rows),
    };
    return new ModelsSnapshotManager(repo as unknown as ConnectorModelsRepository);
  }

  it('returns empty list when no models exist', async () => {
    const manager = buildManager([]);
    const result = await manager.build();
    expect(result.models).toEqual([]);
    expect(typeof result.generatedAt).toBe('string');
  });

  it('maps a text-only row to TEXT in/out modalities', async () => {
    const manager = buildManager([makeRow()]);
    const result = await manager.build();
    expect(result.models).toHaveLength(1);
    expect(result.models[0]!.modalitiesIn).toEqual(['TEXT']);
    expect(result.models[0]!.modalitiesOut).toEqual(['TEXT']);
    expect(result.models[0]!.isLocal).toBe(false);
    expect(result.models[0]!.contextWindowTokens).toBe(128_000);
  });

  it('publishes the smaller of the catalog and learned output ceilings (ADR-125)', async () => {
    const manager = buildManager([
      makeRow({ modelKey: 'a', maxOutputTokens: 32_768, learnedMaxOutputTokens: 16_384 }),
      makeRow({ modelKey: 'b', maxOutputTokens: 8_192, learnedMaxOutputTokens: null }),
      makeRow({ modelKey: 'c', maxOutputTokens: null, learnedMaxOutputTokens: 4_096 }),
      makeRow({ modelKey: 'd' }),
    ]);
    const result = await manager.build();
    expect(result.models.map((model) => model.maxOutputTokens)).toEqual([
      16_384,
      8_192,
      4_096,
      undefined,
    ]);
  });

  it('appends IMAGE_INPUT when supportsVision is true', async () => {
    const manager = buildManager([makeRow({ supportsVision: true })]);
    const result = await manager.build();
    expect(result.models[0]!.modalitiesIn).toContain('IMAGE_INPUT');
  });

  it('appends AUDIO when supportsAudio is true', async () => {
    const manager = buildManager([makeRow({ supportsAudio: true })]);
    const result = await manager.build();
    expect(result.models[0]!.modalitiesIn).toContain('AUDIO');
  });

  it('appends VIDEO_INPUT when supportsVideoInput is true', async () => {
    const manager = buildManager([
      makeRow({
        provider: 'GEMINI',
        modelKey: 'models/gemini-2.5-flash',
        supportsVideoInput: true,
      }),
    ]);
    const result = await manager.build();
    expect(result.models[0]?.modalitiesIn).toContain('VIDEO_INPUT');
  });

  it('does not append VIDEO_INPUT when supportsVideoInput is false', async () => {
    const manager = buildManager([makeRow({ supportsVision: true, supportsAudio: true })]);
    const result = await manager.build();
    expect(result.models[0]?.modalitiesIn).toEqual(['TEXT', 'IMAGE_INPUT', 'AUDIO']);
  });

  // Prod 2026-09-25: the fail-closed Gemini heuristic shipped 2026-09-24, but
  // the last GEMINI sync ran 2026-09-22, so every GEMINI row (antigravity,
  // imagen, veo, lyria, embeddings…) still said supports_audio = true and
  // transcription sent every voice note to a model Gemini refuses. The
  // snapshot applies the heuristic on read, so a stale row cannot lie.
  describe('stale GEMINI rows synced before the fail-closed heuristic', () => {
    it.each([
      'models/antigravity-preview-05-2026',
      'models/imagen-4.0-generate-001',
      'models/gemini-2.5-flash-preview-tts',
      'models/gemini-embedding-001',
      'models/veo-3.1-generate-preview',
    ])('does not advertise AUDIO or VIDEO_INPUT for %s', async (modelKey) => {
      const manager = buildManager([
        makeRow({
          provider: 'GEMINI',
          modelKey,
          supportsVision: true,
          supportsAudio: true,
          supportsVideoInput: true,
        }),
      ]);
      const result = await manager.build();
      expect(result.models[0]?.modalitiesIn).toEqual(['TEXT', 'IMAGE_INPUT']);
    });

    it('still advertises AUDIO for the stable flash family', async () => {
      const manager = buildManager([
        makeRow({
          provider: 'GEMINI',
          modelKey: 'models/gemini-2.5-flash-lite',
          supportsAudio: true,
        }),
      ]);
      const result = await manager.build();
      expect(result.models[0]?.modalitiesIn).toContain('AUDIO');
    });

    it('never turns a false flag true — the guard only narrows', async () => {
      const manager = buildManager([
        makeRow({ provider: 'GEMINI', modelKey: 'models/gemini-2.5-flash', supportsAudio: false }),
      ]);
      const result = await manager.build();
      expect(result.models[0]?.modalitiesIn).not.toContain('AUDIO');
    });

    it('leaves other providers to their own sync', async () => {
      const manager = buildManager([
        makeRow({ provider: 'OPENAI', modelKey: 'gpt-4o-mini-transcribe', supportsAudio: true }),
      ]);
      const result = await manager.build();
      expect(result.models[0]?.modalitiesIn).toContain('AUDIO');
    });
  });

  it('passes provider and modelKey through unchanged', async () => {
    const manager = buildManager([makeRow({ provider: 'ANTHROPIC', modelKey: 'claude-opus-4' })]);
    const result = await manager.build();
    expect(result.models[0]!.provider).toBe('ANTHROPIC');
    expect(result.models[0]!.modelKey).toBe('claude-opus-4');
  });

  it('omits contextWindowTokens when maxContextTokens is null', async () => {
    const manager = buildManager([makeRow({ maxContextTokens: null })]);
    const result = await manager.build();
    expect(result.models[0]!.contextWindowTokens).toBeUndefined();
  });

  // The AUTO router picks from what an admin exposed; without these two fields
  // routing-service could only see the models named in its own chain.
  it('carries the admin exposure and the model kind', async () => {
    const manager = buildManager([makeRow({ exposure: 'EXPOSED', kind: 'CHAT' })]);
    const result = await manager.build();
    expect(result.models[0]).toMatchObject({ exposure: 'EXPOSED', kind: 'CHAT' });
  });
});
