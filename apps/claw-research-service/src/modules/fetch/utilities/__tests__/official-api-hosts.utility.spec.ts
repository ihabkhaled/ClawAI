import { officialApiAllowedHosts } from '../official-api-hosts.utility';

describe('officialApiAllowedHosts', () => {
  it('always contains the fixed API hosts and nothing private', () => {
    const hosts = officialApiAllowedHosts('https://api.github.com/repos/a/b/readme');

    expect(hosts.has('api.github.com')).toBe(true);
    expect(hosts.has('export.arxiv.org')).toBe(true);
    expect(hosts.has('127.0.0.1')).toBe(false);
    expect(hosts.has('localhost')).toBe(false);
  });

  it('adds a Wikipedia language edition only for a *.wikipedia.org URL', () => {
    expect(
      officialApiAllowedHosts('https://de.wikipedia.org/api/rest_v1/page/html/X').has(
        'de.wikipedia.org',
      ),
    ).toBe(true);
    expect(
      officialApiAllowedHosts('http://127.0.0.1/api/rest_v1/page/html/X').has('127.0.0.1'),
    ).toBe(false);
    expect(officialApiAllowedHosts('not a url').size).toBe(4);
  });
});
