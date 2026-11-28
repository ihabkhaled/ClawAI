import { vi } from 'vitest';
import { RuntimeType } from '../../../../generated/prisma';
import { type LocalModelsRepository } from '../../repositories/local-models.repository';
import { type OllamaContextWindowManager } from '../ollama-context-window.manager';
import { RoutingSnapshotManager } from '../routing-snapshot.manager';

// The real context-window manager is replaced by a stub below; this stops its import chain from
// building every runtime adapter, which needs the service's full environment.
vi.mock('../adapters/runtime-adapter-factory', () => ({ getRuntimeAdapter: vi.fn() }));

type Row = {
  name: string;
  tag: string;
  family: string | null;
  runtime: RuntimeType;
  parameters?: string | null;
};

function makeRow(overrides: Partial<Row> = {}): Row {
  return { name: 'gemma3', tag: '4b', family: 'gemma', runtime: RuntimeType.OLLAMA, ...overrides };
}

describe('RoutingSnapshotManager (ollama)', () => {
  const resolve = vi.fn();

  beforeEach(() => {
    resolve.mockReset();
    resolve.mockResolvedValue(new Map<string, number>());
  });

  function buildManager(rows: Row[]): RoutingSnapshotManager {
    const repo = {
      findAllInstalled: vi.fn().mockResolvedValue(rows),
    };
    return new RoutingSnapshotManager(
      repo as unknown as LocalModelsRepository,
      { resolve } as unknown as OllamaContextWindowManager,
    );
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

  // routing-service parses this string into the registry's parameter count (ADR-234).
  it('forwards the size Ollama reports, and omits it when none was reported', async () => {
    const reported = await buildManager([makeRow({ parameters: '7.6B' })]).build();
    expect(reported.models[0]!.parameterCount).toBe('7.6B');
    const missing = await buildManager([makeRow({ parameters: null })]).build();
    expect(missing.models[0]!.parameterCount).toBeUndefined();
  });

  // ADR-234: the picker writes the context beside every model, and Ollama states it itself.
  describe('context window from Ollama /api/show', () => {
    it('forwards the window Ollama stated for each installed model', async () => {
      resolve.mockResolvedValue(new Map([['qwen3:8b', 40_960]]));

      const result = await buildManager([
        makeRow({ name: 'qwen3', tag: '8b' }),
        makeRow({ name: 'gemma3', tag: '4b' }),
      ]).build();

      expect(result.models[0]!.contextWindowTokens).toBe(40_960);
      expect(result.models[1]!.contextWindowTokens).toBeUndefined();
      expect(result.models[1]).not.toHaveProperty('contextWindowTokens');
    });

    it('asks only about Ollama models, by name:tag', async () => {
      await buildManager([
        makeRow({ name: 'qwen3', tag: '8b' }),
        makeRow({ name: 'sdxl', tag: 'turbo', runtime: RuntimeType.COMFYUI }),
      ]).build();

      expect(resolve).toHaveBeenCalledWith(['qwen3:8b']);
    });

    it('forwards no window, and still builds, when nothing was learned', async () => {
      const result = await buildManager([makeRow()]).build();

      expect(result.models).toHaveLength(1);
      expect(result.models[0]).not.toHaveProperty('contextWindowTokens');
    });
  });

  it('propagates family when present, omits when null', async () => {
    const withFamily = await buildManager([makeRow({ family: 'gemma' })]).build();
    expect(withFamily.models[0]!.family).toBe('gemma');
    const noFamily = await buildManager([makeRow({ family: null })]).build();
    expect(noFamily.models[0]!.family).toBeUndefined();
  });
});
