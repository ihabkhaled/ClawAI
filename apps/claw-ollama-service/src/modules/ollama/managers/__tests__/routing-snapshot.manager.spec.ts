import { type LocalModelsRepository } from '../../repositories/local-models.repository';
import { RoutingSnapshotManager } from '../routing-snapshot.manager';

type Row = {
  name: string;
  tag: string;
  family: string | null;
};

function makeRow(overrides: Partial<Row> = {}): Row {
  return { name: 'gemma3', tag: '4b', family: 'gemma', ...overrides };
}

describe('RoutingSnapshotManager (ollama)', () => {
  function buildManager(rows: Row[]): RoutingSnapshotManager {
    const repo = {
      findAllInstalled: jest.fn().mockResolvedValue(rows),
    };
    return new RoutingSnapshotManager(repo as unknown as LocalModelsRepository);
  }

  it('returns an empty list when no local models are installed', async () => {
    const result = await buildManager([]).build();
    expect(result.models).toEqual([]);
  });

  it('joins name and tag into modelKey', async () => {
    const result = await buildManager([makeRow({ name: 'qwen3', tag: '1.7b' })]).build();
    expect(result.models[0]!.modelKey).toBe('qwen3:1.7b');
    expect(result.models[0]!.displayName).toBe('qwen3:1.7b');
  });

  it('always sets provider=OLLAMA, isLocal=true, modalities=[TEXT]', async () => {
    const result = await buildManager([makeRow()]).build();
    expect(result.models[0]!.provider).toBe('OLLAMA');
    expect(result.models[0]!.isLocal).toBe(true);
    expect(result.models[0]!.modalitiesIn).toEqual(['TEXT']);
    expect(result.models[0]!.modalitiesOut).toEqual(['TEXT']);
  });

  it('propagates family when present, omits when null', async () => {
    const withFamily = await buildManager([makeRow({ family: 'gemma' })]).build();
    expect(withFamily.models[0]!.family).toBe('gemma');
    const noFamily = await buildManager([makeRow({ family: null })]).build();
    expect(noFamily.models[0]!.family).toBeUndefined();
  });
});
