import { providerImageDownloadHosts } from '../provider-image-download.utility';

/**
 * TD-038. A provider-supplied image URL is the one destination in this service
 * that no allowlist can name in advance, so the check is the other way round:
 * any public host, never a private one.
 */
describe('providerImageDownloadHosts', () => {
  it('declares the host of a public provider image URL', () => {
    const hosts = providerImageDownloadHosts(
      'https://oaidalleapiprodscus.blob.core.windows.net/private/img-1.png?se=x',
    );
    expect([...hosts]).toEqual(['oaidalleapiprodscus.blob.core.windows.net']);
  });

  it('keeps a non-default port in the declared host', () => {
    const hosts = providerImageDownloadHosts('https://images.example.com:8443/a.png');
    expect([...hosts]).toEqual(['images.example.com:8443']);
  });

  it.each([
    ['localhost', 'http://localhost/a.png'],
    ['loopback', 'http://127.0.0.1/a.png'],
    ['all-zeros', 'http://0.0.0.0/a.png'],
    ['link-local and metadata', 'http://169.254.169.254/latest/meta-data'],
    ['class A private', 'http://10.1.2.3/a.png'],
    ['class B private', 'http://172.20.0.5/a.png'],
    ['class C private', 'http://192.168.1.10/a.png'],
    ['zero network', 'http://0.1.2.3/a.png'],
  ])('refuses a %s image host', (_label, url) => {
    expect(() => providerImageDownloadHosts(url)).toThrow(/refusing a private image host/);
  });

  it('refuses a URL that is not absolute', () => {
    expect(() => providerImageDownloadHosts('/images/a.png')).toThrow(/not absolute/);
  });

  /**
   * The protocol, credential and metadata rejections are the shared guard's
   * job, not this function's — it only answers "may this host be declared".
   * What matters is that it does not DECLARE something the shared guard would
   * then wave through: a private host never reaches it.
   */
  it('refuses a private host even when it is dressed as a public-looking URL', () => {
    expect(() => providerImageDownloadHosts('https://user:pass@127.0.0.1/a.png')).toThrow(
      /refusing a private image host/,
    );
  });
});
