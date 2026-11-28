import { vi } from 'vitest';
import { PassThrough } from 'node:stream';
import { OllamaRuntimeAdapter } from './ollama-runtime.adapter';

// vi.hoisted runs before the hoisted vi.mock factories, so the spec and the
// adapter share one client object without a top-level await inside describe.
const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@common/utilities', () => ({
  createHttpClient: vi.fn(() => mockClient),
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn().mockReturnValue({
      OLLAMA_BASE_URL: 'http://localhost:11434',
      OLLAMA_GENERATE_TIMEOUT_MS: 30_000,
    }),
  },
}));

describe('OllamaRuntimeAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ADR-234: the window of an installed model is read from Ollama itself via /api/show.
  describe('showModel', () => {
    it('posts the model to /api/show with the timeout it is given and returns the raw body', async () => {
      const body = {
        model_info: { 'general.architecture': 'qwen3', 'qwen3.context_length': 40_960 },
      };
      mockClient.post.mockResolvedValue({ data: body });

      const result = await new OllamaRuntimeAdapter().showModel('qwen3:8b', 5_000);

      expect(result).toBe(body);
      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/show',
        { model: 'qwen3:8b' },
        { timeout: 5_000 },
      );
    });

    it('lets a failed call reject, so the caller can leave the window unknown', async () => {
      mockClient.post.mockRejectedValue(new Error('timeout of 5000ms exceeded'));

      await expect(new OllamaRuntimeAdapter().showModel('qwen3:8b', 5_000)).rejects.toThrow(
        'timeout of 5000ms exceeded',
      );
    });
  });

  it('rejects a pull when the runtime emits an error frame', async () => {
    const stream = new PassThrough();
    mockClient.post.mockResolvedValue({ data: stream });

    const adapter = new OllamaRuntimeAdapter();
    const onProgress = vi.fn();
    const pullPromise = adapter.pullModelWithProgress('glm5.1:latest', onProgress);

    setImmediate(() => {
      stream.write('{"status":"pulling manifest"}\n');
      stream.end('{"error":"pull model manifest: file does not exist"}\n');
    });

    await expect(pullPromise).rejects.toThrow('pull model manifest: file does not exist');
    expect(onProgress).toHaveBeenCalledTimes(1);
  });
});
