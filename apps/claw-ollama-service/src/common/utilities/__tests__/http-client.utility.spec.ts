import { createHttpClient, httpGet, httpPost } from '../http-client.utility';

/**
 * The REAL shared guard runs here — `@claw/shared-utilities` is deliberately
 * NOT mocked. These cases are refused before any socket is opened, so the test
 * never touches the network: an unsupported protocol, embedded credentials and
 * the cloud metadata address are all rejected by `assertSafeRequestUrl` ahead
 * of the axios call (CodeQL js/request-forgery, alert #58).
 */
const REFUSED = [
  {
    label: 'a file:// url',
    url: 'file:///etc/passwd',
    message: 'refusing protocol',
  },
  {
    label: 'a url with embedded credentials',
    url: 'https://user:pass@example.com/x',
    message: 'refusing a URL with embedded credentials',
  },
  {
    label: 'the cloud metadata address',
    url: 'http://169.254.169.254/latest/meta-data',
    message: 'refusing a cloud metadata address',
  },
];

describe('http-client.utility', () => {
  describe('httpGet', () => {
    for (const testCase of REFUSED) {
      it(`refuses ${testCase.label}`, async () => {
        await expect(httpGet(testCase.url)).rejects.toThrow(testCase.message);
      });
    }
  });

  describe('httpPost', () => {
    for (const testCase of REFUSED) {
      it(`refuses ${testCase.label}`, async () => {
        await expect(httpPost(testCase.url, { a: 1 })).rejects.toThrow(testCase.message);
      });
    }
  });

  describe('createHttpClient', () => {
    for (const testCase of REFUSED) {
      it(`refuses ${testCase.label} as a baseURL at construction`, () => {
        expect(() => createHttpClient({ baseURL: testCase.url })).toThrow(testCase.message);
      });
    }

    it('builds an instance for an ordinary base url', () => {
      expect(() =>
        createHttpClient(
          { baseURL: 'https://registry.ollama.com' },
          new Set(['registry.ollama.com']),
        ),
      ).not.toThrow();
    });

    it('refuses a per-request url that escapes the declared base', async () => {
      const client = createHttpClient(
        { baseURL: 'https://registry.ollama.com' },
        new Set(['registry.ollama.com']),
      );
      await expect(client.get('http://169.254.169.254/latest/meta-data')).rejects.toThrow(
        'refusing a cloud metadata address',
      );
    });

    it('refuses a per-request baseURL override to an undeclared host', async () => {
      const client = createHttpClient(
        { baseURL: 'https://registry.ollama.com' },
        new Set(['registry.ollama.com']),
      );
      await expect(client.get('/search', { baseURL: 'https://attacker.example' })).rejects.toThrow(
        'refusing a host this service does not call',
      );
    });
  });
});
