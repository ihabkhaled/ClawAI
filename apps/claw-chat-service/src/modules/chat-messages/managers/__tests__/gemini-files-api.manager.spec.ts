// Slice D — GeminiFilesApiManager unit tests.
//
// The manager uses the global `fetch` (the Files API expects a raw upload, not
// JSON, so the manager intentionally does NOT use httpRequest). We stub global
// fetch with jest and assert on the URL it hits, the headers it sets, the
// cache it maintains, and the concurrency semaphore.

import { BusinessException } from '../../../../common/errors';
import { GEMINI_FILES_API_BASE_URL } from '../../constants/gemini-files-api.constants';
import { GeminiFilesApiManager } from '../gemini-files-api.manager';

jest.mock('../../../../app/config/app.config');
const { AppConfig } = jest.requireMock('../../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

type FetchArgs = [string | URL | Request, RequestInit | undefined];

const buildResponse = (body: unknown, init: { status?: number; ok?: boolean } = {}): Response => {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
};

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
    process.env['GEMINI_API_KEY'] = 'test-key';
    manager = new GeminiFilesApiManager();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
    delete process.env['GEMINI_API_KEY'];
  });

  describe('uploadFile', () => {
    it('POSTs to the Gemini Files API base URL with the configured API key', async () => {
      const fetchMock = jest.fn<Promise<Response>, FetchArgs>().mockResolvedValue(
        buildResponse({
          file: {
            uri: 'files/abc-99',
            expirationTime: '2030-01-01T00:00:00Z',
          },
        }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      const result = await manager.uploadFile(Buffer.from('hello world'), 'image/png', 'pic.png');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [urlArg, initArg] = fetchMock.mock.calls[0]!;
      expect(String(urlArg)).toContain(GEMINI_FILES_API_BASE_URL);
      expect(String(urlArg)).toContain('key=test-key');
      expect(initArg!.method).toBe('POST');
      const headers = initArg!.headers as Record<string, string>;
      expect(headers['X-Goog-Upload-Protocol']).toBe('raw');
      expect(headers['X-Goog-Upload-Header-Content-Type']).toBe('image/png');
      expect(headers['X-Goog-Upload-File-Name']).toBe('pic.png');
      expect(headers['X-Goog-Upload-Header-Content-Length']).toBe('11');
      expect(result.fileUri).toBe('files/abc-99');
      expect(result.expiresAt).toEqual(new Date('2030-01-01T00:00:00Z'));
      expect(result.sizeBytes).toBe(11);
      expect(result.mimeType).toBe('image/png');
    });

    it('computes expiresAt from TTL when the server omits expirationTime', async () => {
      AppConfig.get.mockReturnValue({
        ...defaultConfig,
        GEMINI_FILES_API_TTL_MINUTES: 60,
      });
      const fetchMock = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValue(buildResponse({ file: { uri: 'files/no-exp' } }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const before = Date.now();
      const result = await manager.uploadFile(Buffer.from('x'), 'image/png', 'pic');
      const after = Date.now();

      // Should be ~1 hour out, within the call window.
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 60 * 60 * 1000 - 1);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + 60 * 60 * 1000 + 5);
    });

    it('throws GEMINI_FILES_API_RATE_LIMITED on 429', async () => {
      global.fetch = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValue(
          buildResponse({ error: { message: 'rate-limited' } }, { status: 429 }),
        ) as unknown as typeof fetch;

      await expect(manager.uploadFile(Buffer.from('x'), 'image/png', 'pic')).rejects.toMatchObject({
        code: 'GEMINI_FILES_API_RATE_LIMITED',
      });
    });

    it('throws GEMINI_FILES_API_UPLOAD_FAILED on 500', async () => {
      global.fetch = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValue(
          buildResponse({ error: { message: 'oops' } }, { status: 500 }),
        ) as unknown as typeof fetch;

      await expect(manager.uploadFile(Buffer.from('x'), 'image/png', 'pic')).rejects.toMatchObject({
        code: 'GEMINI_FILES_API_UPLOAD_FAILED',
      });
    });

    it('throws GEMINI_FILES_API_MISSING_URI when the response lacks file.uri', async () => {
      global.fetch = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValue(buildResponse({ file: {} })) as unknown as typeof fetch;

      await expect(manager.uploadFile(Buffer.from('x'), 'image/png', 'pic')).rejects.toMatchObject({
        code: 'GEMINI_FILES_API_MISSING_URI',
      });
    });

    it('throws GEMINI_FILES_API_MISSING_KEY when GEMINI_API_KEY is unset', async () => {
      delete process.env['GEMINI_API_KEY'];

      await expect(manager.uploadFile(Buffer.from('x'), 'image/png', 'pic')).rejects.toBeInstanceOf(
        BusinessException,
      );
    });
  });

  describe('getCachedOrUpload', () => {
    it('uploads on cache miss and stores the result for future lookups', async () => {
      const fetchMock = jest.fn<Promise<Response>, FetchArgs>().mockResolvedValue(
        buildResponse({
          file: {
            uri: 'files/first',
            expirationTime: '2099-01-01T00:00:00Z',
          },
        }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      const fileUri = await manager.getCachedOrUpload(
        'file-123',
        Buffer.from('hello'),
        'image/png',
      );

      expect(fileUri).toBe('files/first');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('returns the cached uri on a second call without uploading again', async () => {
      const fetchMock = jest.fn<Promise<Response>, FetchArgs>().mockResolvedValueOnce(
        buildResponse({
          file: {
            uri: 'files/once-only',
            expirationTime: '2099-01-01T00:00:00Z',
          },
        }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      const first = await manager.getCachedOrUpload('file-A', Buffer.from('hi'), 'image/png');
      const second = await manager.getCachedOrUpload('file-A', Buffer.from('hi'), 'image/png');

      expect(first).toBe('files/once-only');
      expect(second).toBe('files/once-only');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('re-uploads when the cached entry has expired', async () => {
      // Configure TTL so the resolveExpiresAt fallback produces an
      // already-expired date — we feed an explicit past expirationTime.
      const fetchMock = jest
        .fn<Promise<Response>, FetchArgs>()
        .mockResolvedValueOnce(
          buildResponse({
            file: {
              uri: 'files/expired',
              expirationTime: '2000-01-01T00:00:00Z',
            },
          }),
        )
        .mockResolvedValueOnce(
          buildResponse({
            file: {
              uri: 'files/fresh',
              expirationTime: '2099-01-01T00:00:00Z',
            },
          }),
        );
      global.fetch = fetchMock as unknown as typeof fetch;

      const first = await manager.getCachedOrUpload('file-EXP', Buffer.from('x'), 'image/png');
      const second = await manager.getCachedOrUpload('file-EXP', Buffer.from('x'), 'image/png');

      expect(first).toBe('files/expired');
      expect(second).toBe('files/fresh');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('bypasses cache when GEMINI_FILES_API_CACHE_ENABLED is false', async () => {
      AppConfig.get.mockReturnValue({
        ...defaultConfig,
        GEMINI_FILES_API_CACHE_ENABLED: false,
      });
      const fetchMock = jest.fn<Promise<Response>, FetchArgs>().mockResolvedValue(
        buildResponse({
          file: {
            uri: 'files/uncached',
            expirationTime: '2099-01-01T00:00:00Z',
          },
        }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      await manager.getCachedOrUpload('id', Buffer.from('a'), 'image/png');
      await manager.getCachedOrUpload('id', Buffer.from('a'), 'image/png');

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('concurrency limit', () => {
    it('respects GEMINI_CONCURRENT_UPLOADS_LIMIT — only N requests are in-flight at once', async () => {
      AppConfig.get.mockReturnValue({
        ...defaultConfig,
        GEMINI_CONCURRENT_UPLOADS_LIMIT: 2,
      });

      let activeNow = 0;
      let peak = 0;
      const fetchMock = jest.fn<Promise<Response>, FetchArgs>().mockImplementation(async () => {
        activeNow += 1;
        if (activeNow > peak) {
          peak = activeNow;
        }
        // Yield to other microtasks so concurrent uploads have a chance to
        // queue up before this one finishes.
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeNow -= 1;
        return buildResponse({
          file: {
            uri: `files/u-${String(Math.random())}`,
            expirationTime: '2099-01-01T00:00:00Z',
          },
        });
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      // Fan out 5 uploads — semaphore should keep peak at 2.
      await Promise.all(
        Array.from({ length: 5 }, (_, idx) =>
          manager.uploadFile(
            Buffer.from(`payload-${String(idx)}`),
            'image/png',
            `name-${String(idx)}`,
          ),
        ),
      );

      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(peak).toBeLessThanOrEqual(2);
      expect(peak).toBeGreaterThan(0);
    });
  });
});
