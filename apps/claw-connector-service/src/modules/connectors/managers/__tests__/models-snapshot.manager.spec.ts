import { type ConnectorModelsRepository } from '../../repositories/connector-models.repository';
import { ModelsSnapshotManager } from '../models-snapshot.manager';

type Row = {
  provider: string;
  modelKey: string;
  displayName: string;
  supportsVision: boolean;
  supportsAudio: boolean;
  maxContextTokens: number | null;
};

function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    provider: 'OPENAI',
    modelKey: 'gpt-4o',
    displayName: 'GPT-4o',
    supportsVision: false,
    supportsAudio: false,
    maxContextTokens: 128_000,
    ...overrides,
  };
}

describe('ModelsSnapshotManager', () => {
  function buildManager(rows: Row[]): ModelsSnapshotManager {
    const repo = {
      findAllForSnapshot: jest.fn().mockResolvedValue(rows),
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
});
