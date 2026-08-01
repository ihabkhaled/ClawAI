import { BusinessException } from '../../../../common/errors';
import { GEMINI_FILES_API_BASE_URL } from '../../constants/gemini-files-api.constants';
import { GeminiFilesApiManager } from '../gemini-files-api.manager';

jest.mock('../../../../app/config/app.config');
const { AppConfig } = jest.requireMock('../../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

type FetchArgs = [string | URL | Request, RequestInit | undefined];

const buildResponse = (
  body: unknown,
  init: { status?: number; ok?: boolean; headers?: Record<string, string> } = {},
): Response => {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    headers: {
      get: jest.fn((name: string) => init.headers?.[name.toLowerCase()] ?? null),
    },
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
};

const buildUploadStartResponse = (sessionUrl: string): Response =>
  buildResponse({}, { headers: { 'x-goog-upload-url': sessionUrl } });

const buildUploadedFileResponse = (
  uri: string,
  overrides: Record<string, unknown> = {},
): Response =>
  buildResponse({
    file: {
      uri,
      expirationTime: '2099-01-01T00:00:00Z',
      ...overrides,
    },
  });

const UPLOAD_SESSION_URL =
  'https://generativelanguage.googleapis.com/upload/v1beta/files/session-1';
const CONNECTOR_KEY = 'connector-secret';

describe('GeminiFilesApiManager', () => {
  let originalFetch: typeof fetch;
  let manager: GeminiFilesApiManager;
  const defaultConfig = {
    GEMINI_FILES_API_TIMEOUT_MS: 60_000,
    GEMINI_FILES_API_CACHE_ENABLED: true,
    GEMINI_FILES_API_TTL_MINUTES: 1440,
    GEMINI_CONCURRENT_UPLOADS_LIMIT: 3,
  };

  beforeEach(() => {
    originalFetch = global.fetch;
    AppConfig.get.mockReturnValue({ ...defaultConfig });
    manager = new GeminiFilesApiManager();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
    delete process.env['GEMINI_API_KEY'];
  });

  describe('uploadFile', () => {
    it('uses the documented resumable protocol and keeps the connector key out of URLs', async () => {
      const fetchMock = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValueOnce(buildUploadStartResponse(UPLOAD_SESSION_URL))
        .mockResolvedValueOnce(
          buildUploadedFileResponse('files/abc-99', {
            expirationTime: '2030-01-01T00:00:00Z',
          }),
        );
      global.fetch = fetchMock as unknown as typeof fetch;

      const result = await manager.uploadFile(
        Buffer.from('hello world'),
        'image/png',
        'pic.png',
        CONNECTOR_KEY,
      );

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [startUrl, startInit] = fetchMock.mock.calls[0]!;
      expect(String(startUrl)).toBe(GEMINI_FILES_API_BASE_URL);
      expect(String(startUrl)).not.toContain(CONNECTOR_KEY);
      const startHeaders = startInit!.headers as Record<string, string>;
      expect(startHeaders['x-goog-api-key']).toBe(CONNECTOR_KEY);
      expect(startHeaders['X-Goog-Upload-Protocol']).toBe('resumable');
      expect(startHeaders['X-Goog-Upload-Command']).toBe('start');
      expect(startHeaders['X-Goog-Upload-Header-Content-Type']).toBe('image/png');
      expect(startHeaders['X-Goog-Upload-Header-Content-Length']).toBe('11');
      expect(startInit!.body).toBe(JSON.stringify({ file: { display_name: 'pic.png' } }));

      const [uploadUrl, uploadInit] = fetchMock.mock.calls[1]!;
      expect(String(uploadUrl)).toBe(UPLOAD_SESSION_URL);
      expect(String(uploadUrl)).not.toContain(CONNECTOR_KEY);
      const uploadHeaders = uploadInit!.headers as Record<string, string>;
      expect(uploadHeaders['x-goog-api-key']).toBe(CONNECTOR_KEY);
      expect(uploadHeaders['X-Goog-Upload-Command']).toBe('upload, finalize');
      expect(uploadHeaders['X-Goog-Upload-Offset']).toBe('0');
      expect(result).toEqual(
        expect.objectContaining({
          fileUri: 'files/abc-99',
          expiresAt: new Date('2030-01-01T00:00:00Z'),
          sizeBytes: 11,
          mimeType: 'image/png',
        }),
      );
    });

    it('does not read a process-level API key when no connector key is supplied', async () => {
      process.env['GEMINI_API_KEY'] = 'process-secret-that-must-not-be-used';

      await expect(manager.uploadFile(Buffer.from('x'), 'image/png', 'pic')).rejects.toMatchObject({
        code: 'GEMINI_FILES_API_MISSING_KEY',
      });
      expect(global.fetch).toBe(originalFetch);
    });

    it('rejects a missing or untrusted upload session URL', async () => {
      global.fetch = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValue(
          buildUploadStartResponse('https://attacker.example/upload'),
        ) as unknown as typeof fetch;

      await expect(
        manager.uploadFile(Buffer.from('x'), 'image/png', 'pic', CONNECTOR_KEY),
      ).rejects.toMatchObject({
        code: 'GEMINI_FILES_API_MISSING_UPLOAD_URL',
      });
    });

    it('throws GEMINI_FILES_API_RATE_LIMITED when the resumable start is rejected', async () => {
      global.fetch = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValue(
          buildResponse({ error: { message: 'rate-limited' } }, { status: 429 }),
        ) as unknown as typeof fetch;

      await expect(
        manager.uploadFile(Buffer.from('x'), 'image/png', 'pic', CONNECTOR_KEY),
      ).rejects.toMatchObject({
        code: 'GEMINI_FILES_API_RATE_LIMITED',
      });
    });

    it('throws GEMINI_FILES_API_UPLOAD_FAILED when finalize is rejected', async () => {
      global.fetch = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValueOnce(buildUploadStartResponse(UPLOAD_SESSION_URL))
        .mockResolvedValueOnce(
          buildResponse({ error: { message: 'oops' } }, { status: 500 }),
        ) as unknown as typeof fetch;

      await expect(
        manager.uploadFile(Buffer.from('x'), 'image/png', 'pic', CONNECTOR_KEY),
      ).rejects.toMatchObject({
        code: 'GEMINI_FILES_API_UPLOAD_FAILED',
      });
    });

    it('throws GEMINI_FILES_API_MISSING_URI when finalize lacks file.uri', async () => {
      global.fetch = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValueOnce(buildUploadStartResponse(UPLOAD_SESSION_URL))
        .mockResolvedValueOnce(buildResponse({ file: {} })) as unknown as typeof fetch;

      await expect(
        manager.uploadFile(Buffer.from('x'), 'image/png', 'pic', CONNECTOR_KEY),
      ).rejects.toMatchObject({
        code: 'GEMINI_FILES_API_MISSING_URI',
      });
    });

    it('computes expiresAt from TTL when the server omits expirationTime', async () => {
      AppConfig.get.mockReturnValue({
        ...defaultConfig,
        GEMINI_FILES_API_TTL_MINUTES: 60,
      });
      global.fetch = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValueOnce(buildUploadStartResponse(UPLOAD_SESSION_URL))
        .mockResolvedValueOnce(
          buildResponse({ file: { uri: 'files/no-exp' } }),
        ) as unknown as typeof fetch;

      const before = Date.now();
      const result = await manager.uploadFile(Buffer.from('x'), 'image/png', 'pic', CONNECTOR_KEY);
      const after = Date.now();

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 60 * 60 * 1000 - 1);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + 60 * 60 * 1000 + 5);
    });

    it('polls a processing video until the Files API reports ACTIVE', async () => {
      jest.useFakeTimers();
      try {
        const fetchMock = jest
          .fn<Promise<Response>, FetchArgs>()
          .mockResolvedValueOnce(buildUploadStartResponse(UPLOAD_SESSION_URL))
          .mockResolvedValueOnce(
            buildUploadedFileResponse('files/video-1', {
              name: 'files/video-1',
              state: 'PROCESSING',
            }),
          )
          .mockResolvedValueOnce(
            buildResponse({
              name: 'files/video-1',
              uri: 'files/video-1',
              mimeType: 'video/mp4',
              state: 'ACTIVE',
            }),
          );
        global.fetch = fetchMock as unknown as typeof fetch;

        const uploadPromise = manager.uploadFile(
          Buffer.from('video'),
          'video/mp4',
          'clip.mp4',
          CONNECTOR_KEY,
        );
        await jest.runAllTimersAsync();
        const result = await uploadPromise;

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(String(fetchMock.mock.calls[2]![0])).toContain('/v1beta/files/video-1');
        expect(result.state).toBe('ACTIVE');
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('cancellation', () => {
    it('removes a cancelled upload from the semaphore queue without starting fetch', async () => {
      AppConfig.get.mockReturnValue({
        ...defaultConfig,
        GEMINI_CONCURRENT_UPLOADS_LIMIT: 1,
      });
      let resolveFirstStart: ((response: Response) => void) | undefined;
      const firstStart = new Promise<Response>((resolve) => {
        resolveFirstStart = resolve;
      });
      const fetchMock = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockImplementationOnce(async () => firstStart)
        .mockResolvedValueOnce(buildUploadedFileResponse('files/first'));
      global.fetch = fetchMock as unknown as typeof fetch;

      const firstUpload = manager.uploadFile(
        Buffer.from('first'),
        'image/png',
        'first.png',
        CONNECTOR_KEY,
      );
      await Promise.resolve();
      const controller = new AbortController();
      const queuedUpload = manager.uploadFile(
        Buffer.from('second'),
        'image/png',
        'second.png',
        CONNECTOR_KEY,
        controller.signal,
      );
      controller.abort();

      await expect(queuedUpload).rejects.toMatchObject({ code: 'STREAM_CANCELLED' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      resolveFirstStart?.(buildUploadStartResponse(UPLOAD_SESSION_URL));
      await firstUpload;
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('aborts an active upload request with the run signal', async () => {
      let fetchSignal: AbortSignal | undefined;
      const fetchMock = jest.fn<Promise<Response>, FetchArgs>().mockImplementation(
        async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            fetchSignal = init?.signal ?? undefined;
            fetchSignal?.addEventListener('abort', () => reject(new Error('aborted')), {
              once: true,
            });
          }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;
      const controller = new AbortController();

      const upload = manager.uploadFile(
        Buffer.from('active'),
        'image/png',
        'active.png',
        CONNECTOR_KEY,
        controller.signal,
      );
      await Promise.resolve();
      controller.abort();

      await expect(upload).rejects.toMatchObject({ code: 'STREAM_CANCELLED' });
      expect(fetchSignal?.aborted).toBe(true);
    });
  });

  describe('getCachedOrUpload', () => {
    it('returns a cached URI on a second call without uploading again', async () => {
      const fetchMock = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValueOnce(buildUploadStartResponse(UPLOAD_SESSION_URL))
        .mockResolvedValueOnce(buildUploadedFileResponse('files/once-only'));
      global.fetch = fetchMock as unknown as typeof fetch;

      const first = await manager.getCachedOrUpload(
        'file-A',
        Buffer.from('hi'),
        'image/png',
        CONNECTOR_KEY,
      );
      const second = await manager.getCachedOrUpload(
        'file-A',
        Buffer.from('hi'),
        'image/png',
        CONNECTOR_KEY,
      );

      expect(first).toBe('files/once-only');
      expect(second).toBe('files/once-only');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('re-uploads after the cached entry expires', async () => {
      const secondSession =
        'https://generativelanguage.googleapis.com/upload/v1beta/files/session-2';
      const fetchMock = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValueOnce(buildUploadStartResponse(UPLOAD_SESSION_URL))
        .mockResolvedValueOnce(
          buildUploadedFileResponse('files/expired', {
            expirationTime: '2000-01-01T00:00:00Z',
          }),
        )
        .mockResolvedValueOnce(buildUploadStartResponse(secondSession))
        .mockResolvedValueOnce(buildUploadedFileResponse('files/fresh'));
      global.fetch = fetchMock as unknown as typeof fetch;

      const first = await manager.getCachedOrUpload(
        'file-EXP',
        Buffer.from('x'),
        'image/png',
        CONNECTOR_KEY,
      );
      const second = await manager.getCachedOrUpload(
        'file-EXP',
        Buffer.from('x'),
        'image/png',
        CONNECTOR_KEY,
      );

      expect(first).toBe('files/expired');
      expect(second).toBe('files/fresh');
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('bypasses cache when GEMINI_FILES_API_CACHE_ENABLED is false', async () => {
      AppConfig.get.mockReturnValue({
        ...defaultConfig,
        GEMINI_FILES_API_CACHE_ENABLED: false,
      });
      let session = 0;
      const fetchMock = jest.fn<Promise<Response>, FetchArgs>().mockImplementation(async (url) => {
        if (String(url) === GEMINI_FILES_API_BASE_URL) {
          session++;
          return buildUploadStartResponse(
            `https://generativelanguage.googleapis.com/upload/v1beta/files/session-${String(session)}`,
          );
        }
        return buildUploadedFileResponse(`files/uncached-${String(session)}`);
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await manager.getCachedOrUpload('id', Buffer.from('a'), 'image/png', CONNECTOR_KEY);
      await manager.getCachedOrUpload('id', Buffer.from('a'), 'image/png', CONNECTOR_KEY);

      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });

  describe('concurrency limit', () => {
    it('keeps complete resumable uploads within the configured concurrency cap', async () => {
      AppConfig.get.mockReturnValue({
        ...defaultConfig,
        GEMINI_CONCURRENT_UPLOADS_LIMIT: 2,
      });
      let session = 0;
      let activeFinalizations = 0;
      let peakFinalizations = 0;
      const fetchMock = jest.fn<Promise<Response>, FetchArgs>().mockImplementation(async (url) => {
        if (String(url) === GEMINI_FILES_API_BASE_URL) {
          session++;
          return buildUploadStartResponse(
            `https://generativelanguage.googleapis.com/upload/v1beta/files/session-${String(session)}`,
          );
        }
        activeFinalizations++;
        peakFinalizations = Math.max(peakFinalizations, activeFinalizations);
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeFinalizations--;
        return buildUploadedFileResponse(`files/u-${String(session)}`);
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await Promise.all(
        Array.from({ length: 5 }, (_, index) =>
          manager.uploadFile(
            Buffer.from(`payload-${String(index)}`),
            'image/png',
            `name-${String(index)}`,
            CONNECTOR_KEY,
          ),
        ),
      );

      expect(fetchMock).toHaveBeenCalledTimes(10);
      expect(peakFinalizations).toBeGreaterThan(0);
      expect(peakFinalizations).toBeLessThanOrEqual(2);
    });
  });

  it('returns typed business exceptions for contract failures', async () => {
    await expect(manager.uploadFile(Buffer.from('x'), 'image/png', 'pic')).rejects.toBeInstanceOf(
      BusinessException,
    );
  });
});
