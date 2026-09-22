import { httpRequest } from '../http-client.utility';

/**
 * The URL reaching `httpRequest` is built by its callers, which is the shape of
 * a server-side request forgery (CodeQL js/request-forgery, alert #58). These
 * assert the chokepoint refuses before `fetch` is ever reached — the "never
 * called" expectation is the point: a guard that rejects after opening the
 * socket has already leaked the request.
 */
describe('httpRequest URL guard', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('refuses a file:// URL and never opens a socket', async () => {
    await expect(httpRequest({ url: 'file:///etc/passwd', method: 'GET' })).rejects.toThrow(
      /refusing protocol/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a URL with embedded credentials', async () => {
    await expect(
      httpRequest({ url: 'https://user:pass@example.com/x', method: 'GET' }),
    ).rejects.toThrow(/embedded credentials/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses the cloud metadata address', async () => {
    await expect(
      httpRequest({ url: 'http://169.254.169.254/latest/meta-data', method: 'GET' }),
    ).rejects.toThrow(/cloud metadata/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a URL that is not absolute', async () => {
    await expect(httpRequest({ url: '/api/v1/health', method: 'GET' })).rejects.toThrow(
      /not absolute/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
