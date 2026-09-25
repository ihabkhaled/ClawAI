import { vi } from 'vitest';

const fetchMock = vi.fn();
const constructorMock = vi.fn();

vi.mock('impit', () => ({
  default: {
    Impit: class {
      fetch = fetchMock;
      constructor(options: unknown) {
        constructorMock(options);
      }
    },
  },
}));

const { ImpersonatingHttpClient } = await import('../impit-client.utility');

describe('ImpersonatingHttpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds one Chrome-impersonating client that never follows redirects itself', async () => {
    fetchMock.mockResolvedValue({
      status: 302,
      headers: new Headers({ location: '/next', 'content-type': 'text/html' }),
      body: null,
      decodeBuffer: (bytes: Buffer) => bytes.toString('latin1'),
    });
    const client = new ImpersonatingHttpClient('chrome');

    const first = await client.get('https://example.com/', 5_000);
    await client.get('https://example.com/other', 5_000);

    expect(constructorMock).toHaveBeenCalledTimes(1);
    expect(constructorMock).toHaveBeenCalledWith({ browser: 'chrome', followRedirects: false });
    expect(first.status).toBe(302);
    expect(first.location).toBe('/next');
    expect(first.contentType).toBe('text/html');
    expect(first.decode(Buffer.from('ok'))).toBe('ok');
  });
});
