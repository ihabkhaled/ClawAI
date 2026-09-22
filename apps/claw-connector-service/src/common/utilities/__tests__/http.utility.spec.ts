import { vi } from 'vitest';
import { httpGet, httpGetText, httpPost } from '../http.utility';

function mockFetchBody(status: number, bodyText: string): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(bodyText),
  });
}

describe('httpGet JSON handling', () => {
  it('parses a JSON body', async () => {
    mockFetchBody(200, '{"data":[{"id":"a"}]}');

    const response = await httpGet<{ data: Array<{ id: string }> }>({
      url: 'https://x.test/models',
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data.data[0]?.id).toBe('a');
  });

  it('still parses a JSON error body, so callers can read the provider reason', async () => {
    mockFetchBody(400, '{"error":{"message":"workspace required"}}');

    const response = await httpGet<{ error: { message: string } }>({
      url: 'https://x.test/models',
    });

    expect(response.ok).toBe(false);
    expect(response.data.error.message).toBe('workspace required');
  });

  // A base URL missing its version segment 404s to an HTML error page. The bare
  // `response.json()` threw SyntaxError — "Unexpected end of JSON input" — which
  // named neither the URL nor the status, leaving an operator nothing to act on.
  it('names the url and status when the body is not JSON', async () => {
    mockFetchBody(404, '<html><body>Not Found</body></html>');

    await expect(httpGet({ url: 'https://api.anthropic.com/models' })).rejects.toThrow(
      'https://api.anthropic.com/models returned HTTP 404 with a non-JSON body: <html><body>Not Found</body></html>',
    );
  });

  it('says so explicitly when the body is empty', async () => {
    mockFetchBody(404, '');

    await expect(httpGet({ url: 'https://x.test/models' })).rejects.toThrow('(empty body)');
  });

  it('truncates a long non-JSON body rather than echoing a whole page', async () => {
    mockFetchBody(500, 'x'.repeat(5000));

    await expect(httpGet({ url: 'https://x.test/models' })).rejects.toThrow(
      new RegExp(`non-JSON body: x{200}$`),
    );
  });
});

// TD-038. Every URL these helpers open is built from a connector row an
// operator edits, which is the shape CodeQL calls request forgery: whatever
// steers that string steers where this service connects. `assertSafeRequestUrl`
// is the chokepoint, and these cases prove all three helpers reach it BEFORE
// fetch — the refusals below hold whatever the host allowlist says.
describe('request URL guard', () => {
  const REFUSED = [
    {
      label: 'a file:// url',
      url: 'file:///etc/passwd',
      reason: 'refusing protocol "file:"',
    },
    {
      label: 'a url with embedded credentials',
      url: 'https://user:pass@example.com/x',
      reason: 'refusing a URL with embedded credentials',
    },
    {
      label: 'the cloud metadata address',
      url: 'http://169.254.169.254/latest/meta-data',
      reason: 'refusing a cloud metadata address',
    },
  ];

  beforeEach(() => {
    mockFetchBody(200, '{}');
  });

  for (const { label, url, reason } of REFUSED) {
    it(`httpGet refuses ${label}`, async () => {
      await expect(httpGet({ url })).rejects.toThrow(reason);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it(`httpGetText refuses ${label}`, async () => {
      await expect(httpGetText({ url })).rejects.toThrow(reason);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it(`httpPost refuses ${label}`, async () => {
      await expect(httpPost({ url, body: { probe: true } })).rejects.toThrow(reason);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  }

  // The refusal must arrive as a rejected promise, not a synchronous throw:
  // every adapter wraps its call in `try { await ... }`, and a synchronous
  // throw would sail straight past that and out of healthCheck as an
  // unhandled failure instead of a DOWN status.
  it('rejects rather than throwing synchronously', () => {
    const pending = httpGet({ url: 'file:///etc/passwd' });

    expect(pending).toBeInstanceOf(Promise);
    return expect(pending).rejects.toThrow('refusing protocol');
  });

  // A redirect turns an allowed host into whatever the answer names, after the
  // check has already run. None of these helpers stream, so refusing costs
  // nothing.
  it('never follows a redirect', async () => {
    await httpGet({ url: 'https://x.test/models' });

    const init = vi.mocked(global.fetch).mock.calls[0]?.[1];
    expect(init?.redirect).toBe('error');
  });
});
