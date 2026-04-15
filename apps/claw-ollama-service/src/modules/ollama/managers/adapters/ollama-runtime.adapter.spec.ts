import { PassThrough } from 'node:stream';
import { OllamaRuntimeAdapter } from './ollama-runtime.adapter';

jest.mock('@common/utilities', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  };

  return {
    __mockClient: mockClient,
    createHttpClient: jest.fn(() => mockClient),
  };
});

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn().mockReturnValue({
      OLLAMA_BASE_URL: 'http://localhost:11434',
      OLLAMA_GENERATE_TIMEOUT_MS: 30_000,
    }),
  },
}));

describe('OllamaRuntimeAdapter', () => {
  const mockClient = jest.requireMock('@common/utilities').__mockClient as {
    get: jest.Mock;
    post: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a pull when the runtime emits an error frame', async () => {
    const stream = new PassThrough();
    mockClient.post.mockResolvedValue({ data: stream });

    const adapter = new OllamaRuntimeAdapter();
    const onProgress = jest.fn();
    const pullPromise = adapter.pullModelWithProgress('glm5.1:latest', onProgress);

    setImmediate(() => {
      stream.write('{"status":"pulling manifest"}\n');
      stream.end('{"error":"pull model manifest: file does not exist"}\n');
    });

    await expect(pullPromise).rejects.toThrow('pull model manifest: file does not exist');
    expect(onProgress).toHaveBeenCalledTimes(1);
  });
});
