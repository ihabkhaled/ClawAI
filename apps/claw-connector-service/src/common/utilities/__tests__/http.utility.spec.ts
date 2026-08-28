import { httpGet } from '../http.utility';

function mockFetchBody(status: number, bodyText: string): void {
  global.fetch = jest.fn().mockResolvedValue({
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
