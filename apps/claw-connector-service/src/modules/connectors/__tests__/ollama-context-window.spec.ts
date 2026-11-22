import { type Mock, vi } from 'vitest';
import { OllamaAdapter } from '../managers/adapters/ollama.adapter';
import {
  OLLAMA_SHOW_CONCURRENCY,
  OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC,
  OLLAMA_SHOW_TIMEOUT_MS,
} from '../constants/ollama.constants';
import type { ConnectorConfig } from '../managers/provider-adapter.interface';
import { parseOllamaContextLength } from '../utilities/ollama-context-length.utility';
import { mapWithConcurrency } from '../utilities/bounded-concurrency.utility';

vi.mock('../../../common/utilities/http.utility', () => ({
  httpGet: vi.fn(),
  httpGetText: vi.fn(),
  httpPost: vi.fn(),
}));

const { httpGet, httpGetText, httpPost } = (await vi.importMock(
  '../../../common/utilities/http.utility',
)) as { httpGet: Mock; httpGetText: Mock; httpPost: Mock };

const CONFIG: ConnectorConfig = {
  provider: 'OLLAMA',
  apiKey: 'ollama-cloud-key',
  baseUrl: 'https://ollama.com/api',
} as ConnectorConfig;

function tags(names: string[]): void {
  httpGet.mockResolvedValue({
    ok: true,
    status: 200,
    data: { models: names.map((name) => ({ name, model: name })) },
  });
}

function show(arch: string, contextLength: unknown): { ok: true; status: 200; data: unknown } {
  return {
    ok: true,
    status: 200,
    data: {
      model_info: {
        'general.architecture': arch,
        [`${arch}.context_length`]: contextLength,
      },
    },
  };
}

function windowOf(models: Awaited<ReturnType<OllamaAdapter['syncModels']>>, key: string) {
  return models.find((model) => model.modelKey === key)?.capabilities.maxContextTokens;
}

describe('parseOllamaContextLength', () => {
  it('reads the architecture-prefixed key', () => {
    expect(parseOllamaContextLength(show('deepseek2', 262_144).data)).toBe(262_144);
  });

  it('prefers the architecture key over another *.context_length', () => {
    expect(
      parseOllamaContextLength({
        model_info: {
          'general.architecture': 'qwen3',
          'qwen3.context_length': 131_072,
          'clip.context_length': 999_999,
        },
      }),
    ).toBe(131_072);
  });

  it('falls back to the largest *.context_length when no arch key is present', () => {
    expect(
      parseOllamaContextLength({
        model_info: { 'llama.context_length': 8_192, 'mllama.context_length': 131_072 },
      }),
    ).toBe(131_072);
  });

  it.each([
    ['no model_info', {}],
    ['a non-object body', 'nope'],
    ['a zero window', show('qwen3', 0).data],
    ['a fractional window', show('qwen3', 1.5).data],
    ['a string window', show('qwen3', '131072').data],
    ['no context_length key', { model_info: { 'general.architecture': 'qwen3' } }],
  ])('returns undefined for %s', (_label, body) => {
    expect(parseOllamaContextLength(body)).toBeUndefined();
  });
});

describe('OllamaAdapter /api/show window fill', () => {
  let adapter: OllamaAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    httpGet.mockReset();
    httpPost.mockReset();
    httpGetText.mockReset();
    httpGetText.mockResolvedValue({ ok: true, status: 200, data: '' });
    adapter = new OllamaAdapter();
  });

  it('fills a model the table does not size from /api/show, with auth, host and timeout', async () => {
    tags(['kimi-k3.1-pro:cloud']);
    httpPost.mockResolvedValueOnce(show('kimi', 262_144));

    const models = await adapter.syncModels(CONFIG);

    expect(windowOf(models, 'kimi-k3.1-pro:cloud')).toBe(262_144);
    expect(httpPost).toHaveBeenCalledWith({
      url: 'https://ollama.com/api/show',
      headers: { Authorization: 'Bearer ollama-cloud-key' },
      allowedHosts: new Set(['ollama.com']),
      timeoutMs: OLLAMA_SHOW_TIMEOUT_MS,
      body: { model: 'kimi-k3.1-pro:cloud' },
    });
  });

  it('keeps the curated table value and never looks it up', async () => {
    tags(['gemma4:31b']);

    const models = await adapter.syncModels(CONFIG);

    expect(windowOf(models, 'gemma4:31b')).toBe(256_000);
    expect(httpPost).not.toHaveBeenCalled();
  });

  it('leaves the window undefined on a failed lookup without failing the sync', async () => {
    tags(['a-model', 'b-model', 'c-model']);
    httpPost
      .mockResolvedValueOnce({ ok: false, status: 404, data: { error: 'not found' } })
      .mockRejectedValueOnce(new Error('The operation was aborted'))
      .mockResolvedValueOnce({ ok: true, status: 200, data: { model_info: {} } });

    const models = await adapter.syncModels(CONFIG);

    expect(models.map((model) => model.modelKey)).toEqual(['a-model', 'b-model', 'c-model']);
    expect(models.every((model) => model.capabilities.maxContextTokens === undefined)).toBe(true);
  });

  it('caches results across syncs (successes and failures)', async () => {
    tags(['kimi-k3.1-pro:cloud', 'broken']);
    httpPost.mockImplementation((options: { body: { model: string } }) =>
      Promise.resolve(
        options.body.model === 'broken'
          ? { ok: false, status: 500, data: {} }
          : show('kimi', 262_144),
      ),
    );

    await adapter.syncModels(CONFIG);
    const second = await adapter.syncModels(CONFIG);

    expect(httpPost).toHaveBeenCalledTimes(2);
    expect(windowOf(second, 'kimi-k3.1-pro:cloud')).toBe(262_144);
    expect(windowOf(second, 'broken')).toBeUndefined();
  });

  it('keeps at most OLLAMA_SHOW_CONCURRENCY lookups in flight and caps lookups per sync', async () => {
    const names = Array.from(
      { length: OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC + 20 },
      (_, index) => `unknown-${String(index)}`,
    );
    tags(names);
    let inFlight = 0;
    let peak = 0;
    httpPost.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return show('llama', 32_768);
    });

    const models = await adapter.syncModels(CONFIG);

    expect(peak).toBeLessThanOrEqual(OLLAMA_SHOW_CONCURRENCY);
    expect(peak).toBeGreaterThan(1);
    expect(httpPost).toHaveBeenCalledTimes(OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC);
    expect(models.filter((model) => model.capabilities.maxContextTokens === 32_768)).toHaveLength(
      OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC,
    );
  });
});

describe('mapWithConcurrency', () => {
  it('keeps input order and handles an empty list', async () => {
    await expect(mapWithConcurrency([], 4, () => Promise.resolve(1))).resolves.toEqual([]);
    await expect(
      mapWithConcurrency([3, 1, 2], 2, async (value) => {
        await new Promise((resolve) => setTimeout(resolve, value));
        return value * 10;
      }),
    ).resolves.toEqual([30, 10, 20]);
  });
});
