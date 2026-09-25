import { vi, type Mock } from 'vitest';
import { AppConfig } from '../../../../app/config/app.config';
import { RobotsTxtAdapter } from '../robots-txt.adapter';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn() },
}));

const impersonatedGet = vi.fn();
vi.mock('../../../../common/utilities/impit-client.utility', () => ({
  ImpersonatingHttpClient: class {
    get = impersonatedGet;
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

function plainResponse(status: number, text = ''): Record<string, unknown> {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    body: stream(text),
  };
}

describe('RobotsTxtAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AppConfig.get as Mock).mockReturnValue({ RESEARCH_DOMAIN_ALLOWLIST: [] });
  });

  it('returns the plain body on 200', async () => {
    global.fetch = vi.fn().mockResolvedValue(plainResponse(200, 'User-agent: *\nDisallow: /x'));

    const outcome = await new RobotsTxtAdapter().fetchRobotsTxt('https://example.com/robots.txt');

    expect(outcome).toEqual({ status: 200, body: 'User-agent: *\nDisallow: /x', via: 'plain' });
    expect(impersonatedGet).not.toHaveBeenCalled();
  });

  it('retries a 403 with the impersonating client so a WAF cannot hide the rules', async () => {
    global.fetch = vi.fn().mockResolvedValue(plainResponse(403));
    impersonatedGet.mockResolvedValue({
      status: 200,
      location: null,
      contentType: 'text/plain',
      body: stream('User-agent: *\nDisallow: /search/'),
      decode: (bytes: Buffer) => bytes.toString('utf8'),
    });

    const outcome = await new RobotsTxtAdapter().fetchRobotsTxt('https://example.com/robots.txt');

    expect(outcome).toEqual({
      status: 200,
      body: 'User-agent: *\nDisallow: /search/',
      via: 'impersonated',
    });
  });

  it('keeps the plain answer when the impersonated retry fails to connect', async () => {
    global.fetch = vi.fn().mockResolvedValue(plainResponse(403));
    impersonatedGet.mockRejectedValue(new Error('tls'));

    const outcome = await new RobotsTxtAdapter().fetchRobotsTxt('https://example.com/robots.txt');

    expect(outcome).toEqual({ status: 403, body: null, via: 'plain' });
  });

  it('reports an unreachable host as status null', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

    const outcome = await new RobotsTxtAdapter().fetchRobotsTxt('https://gone.example/robots.txt');

    expect(outcome.status).toBeNull();
  });

  it('never requests a loopback robots.txt (both guards refuse it before any fetch)', async () => {
    global.fetch = vi.fn();

    const outcome = await new RobotsTxtAdapter().fetchRobotsTxt('http://127.0.0.1/robots.txt');

    expect(outcome.status).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(impersonatedGet).not.toHaveBeenCalled();
  });

  it('refuses a robots.txt URL with embedded credentials before any fetch', async () => {
    global.fetch = vi.fn();

    const outcome = await new RobotsTxtAdapter().fetchRobotsTxt(
      'https://user:pw@example.com/robots.txt',
    );

    expect(outcome.status).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
