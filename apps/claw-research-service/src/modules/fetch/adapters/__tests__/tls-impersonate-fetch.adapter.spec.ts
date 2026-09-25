import { vi, type Mock } from 'vitest';
import { AppConfig } from '../../../../app/config/app.config';
import { FetchStrategyKind } from '../../../../generated/prisma';
import { TlsImpersonateFetchAdapter } from '../tls-impersonate-fetch.adapter';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn() },
}));

const getMock = vi.fn();
vi.mock('../../../../common/utilities/impit-client.utility', () => ({
  ImpersonatingHttpClient: class {
    get = getMock;
  },
}));

function stream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

function exchange(status: number, body: string, location: string | null = null) {
  return {
    status,
    location,
    contentType: 'text/html; charset=utf-8',
    body: stream(body),
    decode: (bytes: Buffer) => bytes.toString('utf8'),
  };
}

describe('TlsImpersonateFetchAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AppConfig.get as Mock).mockReturnValue({ RESEARCH_DOMAIN_ALLOWLIST: [] });
  });

  it('declares its strategy kind', () => {
    expect(new TlsImpersonateFetchAdapter().kind).toBe(FetchStrategyKind.HTTP_TLS_IMPERSONATE);
  });

  it('fetches through the impersonating client and extracts the page', async () => {
    getMock.mockResolvedValue(
      exchange(
        200,
        '<html><head><title>Fiverr</title></head><body><p>Hire freelancers</p></body></html>',
      ),
    );

    const result = await new TlsImpersonateFetchAdapter().fetchPage({
      url: 'https://www.fiverr.com/',
    });

    expect(result.httpStatus).toBe(200);
    expect(result.title).toBe('Fiverr');
    expect(result.content).toContain('Hire freelancers');
  });

  it('keeps the real status of a block page so the classifier sees it', async () => {
    getMock.mockResolvedValue(exchange(403, '<html><body>Forbidden</body></html>'));

    const result = await new TlsImpersonateFetchAdapter().fetchPage({
      url: 'https://example.com/',
    });

    expect(result.httpStatus).toBe(403);
  });

  it('checks each redirect hop and refuses one that points at a private host', async () => {
    getMock.mockResolvedValueOnce(exchange(301, '', 'http://10.0.0.5/admin'));

    await expect(
      new TlsImpersonateFetchAdapter().fetchPage({ url: 'https://example.com/' }),
    ).rejects.toThrow();
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('refuses a private-host target before any request', async () => {
    await expect(
      new TlsImpersonateFetchAdapter().fetchPage({ url: 'http://127.0.0.1/' }),
    ).rejects.toThrow();
    expect(getMock).not.toHaveBeenCalled();
  });
});
