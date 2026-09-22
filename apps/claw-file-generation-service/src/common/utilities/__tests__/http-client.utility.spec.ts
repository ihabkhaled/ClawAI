import { httpGet, httpPost } from '../http-client.utility';

/**
 * These wrappers delegate to `@claw/shared-utilities`, so the refusals below
 * come from the REAL shared guard (`assertSafeRequestUrl`). The shared module
 * is deliberately NOT mocked: mocking it away would assert nothing about the
 * behaviour this file exists to prove.
 *
 * Nothing is sent in any of these cases — the guard throws before axios is
 * reached, which is exactly the property being asserted. The `allowedHosts`
 * case uses a host that is NOT declared, so it is refused rather than dialled.
 */
const REFUSED_URLS: readonly { label: string; url: string; message: RegExp }[] = [
  { label: 'a file:// url', url: 'file:///etc/passwd', message: /refusing protocol/ },
  {
    label: 'a url with embedded credentials',
    url: 'https://user:pass@example.com/x',
    message: /embedded credentials/,
  },
  {
    label: 'the cloud metadata address',
    url: 'http://169.254.169.254/latest/meta-data',
    message: /cloud metadata address/,
  },
];

describe('http-client.utility', () => {
  describe('httpGet', () => {
    for (const testCase of REFUSED_URLS) {
      it(`refuses ${testCase.label}`, async () => {
        await expect(httpGet(testCase.url)).rejects.toThrow(testCase.message);
      });
    }
  });

  describe('httpPost', () => {
    for (const testCase of REFUSED_URLS) {
      it(`refuses ${testCase.label}`, async () => {
        await expect(httpPost(testCase.url, {})).rejects.toThrow(testCase.message);
      });
    }
  });

  describe('allowedHosts passthrough', () => {
    it('forwards allowedHosts to the shared guard on httpGet', async () => {
      await expect(
        httpGet('https://other.example.com/x', undefined, new Set(['declared.example.com'])),
      ).rejects.toThrow(/does not call/);
    });

    it('forwards allowedHosts to the shared guard on httpPost', async () => {
      await expect(
        httpPost('https://other.example.com/x', {}, undefined, new Set(['declared.example.com'])),
      ).rejects.toThrow(/does not call/);
    });
  });
});
