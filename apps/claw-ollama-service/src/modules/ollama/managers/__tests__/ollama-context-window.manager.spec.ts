import { vi } from 'vitest';
import {
  OLLAMA_SHOW_CACHE_TTL_MS,
  OLLAMA_SHOW_CONCURRENCY,
  OLLAMA_SHOW_FAILURE_RETRY_MS,
  OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC,
  OLLAMA_SHOW_SYNC_BUDGET_MS,
  OLLAMA_SHOW_TIMEOUT_MS,
} from '../../constants/ollama-show.constants';
import { OllamaContextWindowManager } from '../ollama-context-window.manager';

const { mockShow, mockAdapter } = vi.hoisted(() => {
  const show = vi.fn();
  return { mockShow: show, mockAdapter: { showModel: show } as { showModel?: typeof show } };
});

vi.mock('../adapters/runtime-adapter-factory', () => ({
  getRuntimeAdapter: vi.fn(() => mockAdapter),
}));

function body(arch: string, contextLength: unknown): unknown {
  return {
    model_info: { 'general.architecture': arch, [`${arch}.context_length`]: contextLength },
  };
}

describe('OllamaContextWindowManager', () => {
  let manager: OllamaContextWindowManager;
  let now: number;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdapter.showModel = mockShow;
    now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    manager = new OllamaContextWindowManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads each window from /api/show, bounded by the lookup timeout', async () => {
    mockShow.mockImplementation((name: string) =>
      Promise.resolve(name === 'qwen3:8b' ? body('qwen3', 40_960) : body('gemma3', 131_072)),
    );

    const windows = await manager.resolve(['qwen3:8b', 'gemma3:27b']);

    expect(windows.get('qwen3:8b')).toBe(40_960);
    expect(windows.get('gemma3:27b')).toBe(131_072);
    expect(mockShow).toHaveBeenCalledWith('qwen3:8b', OLLAMA_SHOW_TIMEOUT_MS);
    expect(mockShow).toHaveBeenCalledWith('gemma3:27b', OLLAMA_SHOW_TIMEOUT_MS);
  });

  it('asks once per model even when a name is listed twice', async () => {
    mockShow.mockResolvedValue(body('llama', 8_192));

    await manager.resolve(['llama3.1:8b', 'llama3.1:8b']);

    expect(mockShow).toHaveBeenCalledTimes(1);
  });

  it('leaves a model out when model_info has no context_length', async () => {
    mockShow.mockResolvedValue({ model_info: { 'general.architecture': 'llama' } });

    const windows = await manager.resolve(['llama3.1:8b']);

    expect(windows.has('llama3.1:8b')).toBe(false);
    expect(windows.size).toBe(0);
  });

  it('leaves a model out, and does not throw, when the lookup fails or times out', async () => {
    mockShow.mockImplementation((name: string) =>
      name === 'broken:1b'
        ? Promise.reject(new Error('timeout of 5000ms exceeded'))
        : Promise.resolve(body('llama', 8_192)),
    );

    const windows = await manager.resolve(['broken:1b', 'llama3.1:8b']);

    expect(windows.has('broken:1b')).toBe(false);
    expect(windows.get('llama3.1:8b')).toBe(8_192);
  });

  it('never invents a window for a malformed answer', async () => {
    mockShow.mockResolvedValue('<html>gateway</html>');

    const windows = await manager.resolve(['llama3.1:8b']);

    expect(windows.size).toBe(0);
  });

  it('does not ask again within the cache lifetime', async () => {
    mockShow.mockResolvedValue(body('llama', 8_192));
    await manager.resolve(['llama3.1:8b']);

    now += OLLAMA_SHOW_CACHE_TTL_MS - 1;
    const windows = await manager.resolve(['llama3.1:8b']);

    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(windows.get('llama3.1:8b')).toBe(8_192);
  });

  it('asks again after the cache lifetime', async () => {
    mockShow
      .mockResolvedValueOnce(body('llama', 8_192))
      .mockResolvedValueOnce(body('llama', 16_384));
    await manager.resolve(['llama3.1:8b']);

    now += OLLAMA_SHOW_CACHE_TTL_MS + 1;
    const windows = await manager.resolve(['llama3.1:8b']);

    expect(mockShow).toHaveBeenCalledTimes(2);
    expect(windows.get('llama3.1:8b')).toBe(16_384);
  });

  it('retries a failed lookup after an hour, not on the next sync', async () => {
    mockShow.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(body('llama', 8_192));
    await manager.resolve(['llama3.1:8b']);

    now += OLLAMA_SHOW_FAILURE_RETRY_MS - 1;
    await manager.resolve(['llama3.1:8b']);
    expect(mockShow).toHaveBeenCalledTimes(1);

    now += 2;
    const windows = await manager.resolve(['llama3.1:8b']);
    expect(mockShow).toHaveBeenCalledTimes(2);
    expect(windows.get('llama3.1:8b')).toBe(8_192);
  });

  // routing-service writes NULL over a window the snapshot omits, so a timeout must not drop
  // a window that was read before.
  it('keeps a window it read earlier through a later failed lookup', async () => {
    mockShow.mockResolvedValueOnce(body('llama', 8_192)).mockRejectedValueOnce(new Error('boom'));
    await manager.resolve(['llama3.1:8b']);

    now += OLLAMA_SHOW_CACHE_TTL_MS + 1;
    const windows = await manager.resolve(['llama3.1:8b']);

    expect(mockShow).toHaveBeenCalledTimes(2);
    expect(windows.get('llama3.1:8b')).toBe(8_192);
  });

  it('caps the lookups of one sync and leaves the rest for the next', async () => {
    mockShow.mockResolvedValue(body('llama', 8_192));
    const names = Array.from(
      { length: OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC + 20 },
      (_, i) => `m${String(i)}:1b`,
    );

    const first = await manager.resolve(names);
    expect(mockShow).toHaveBeenCalledTimes(OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC);
    expect(first.size).toBe(OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC);

    const second = await manager.resolve(names);
    expect(mockShow).toHaveBeenCalledTimes(OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC + 20);
    expect(second.size).toBe(OLLAMA_SHOW_MAX_LOOKUPS_PER_SYNC + 20);
  });

  it('never has more than the allowed number of lookups in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    mockShow.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setImmediate(resolve));
      inFlight -= 1;
      return body('llama', 8_192);
    });

    await manager.resolve(Array.from({ length: 20 }, (_, i) => `m${String(i)}:1b`));

    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(OLLAMA_SHOW_CONCURRENCY);
  });

  it('starts no new lookup once the sync budget is spent, and does not cache the skipped ones', async () => {
    mockShow.mockImplementation(() => {
      now += OLLAMA_SHOW_SYNC_BUDGET_MS + 1;
      return Promise.resolve(body('llama', 8_192));
    });
    const names = Array.from({ length: 12 }, (_, i) => `m${String(i)}:1b`);

    const first = await manager.resolve(names);
    expect(mockShow.mock.calls.length).toBeLessThan(names.length);
    expect(first.size).toBe(mockShow.mock.calls.length);

    mockShow.mockImplementation(() => Promise.resolve(body('llama', 8_192)));
    mockShow.mockClear();
    const second = await manager.resolve(names);
    expect(mockShow).toHaveBeenCalledTimes(names.length - first.size);
    expect(second.size).toBe(names.length);
  });

  it('forgets a model that is no longer installed, so the cache never outgrows the install set', async () => {
    mockShow.mockResolvedValue(body('llama', 8_192));
    await manager.resolve(['gone:1b', 'kept:1b']);

    await manager.resolve(['kept:1b']);
    mockShow.mockClear();
    await manager.resolve(['gone:1b']);

    expect(mockShow).toHaveBeenCalledTimes(1);
  });

  it('answers nothing, without throwing, when the runtime adapter has no /api/show', async () => {
    mockAdapter.showModel = undefined;

    const windows = await manager.resolve(['llama3.1:8b']);

    expect(windows.size).toBe(0);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it('does nothing for an empty install set', async () => {
    const windows = await manager.resolve([]);

    expect(windows.size).toBe(0);
    expect(mockShow).not.toHaveBeenCalled();
  });
});
