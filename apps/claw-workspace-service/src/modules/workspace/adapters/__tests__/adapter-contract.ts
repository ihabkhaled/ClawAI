import type { WorkspaceAdapter } from '../workspace-adapter.interface';

/**
 * Shared contract test. Every workspace adapter's test file must call
 * `runAdapterContract(() => new SomeAdapter(...))` so we guarantee the full
 * interface is implemented, defaults are sane, and capabilities are truthful.
 *
 * Run inside an existing `describe(...)` block:
 *
 *   describe('GitHubAdapter', () => {
 *     runAdapterContract(() => new GitHubAdapter(), {
 *       expectDefaultScopes: true,
 *       expectValidatePat: true,
 *     });
 *   });
 */

type ContractOptions = {
  /** Some adapters have no default scopes (e.g. providers with per-request scope selection). */
  expectDefaultScopes?: boolean;
  /** PAT-capable adapters must implement validatePat. */
  expectValidatePat?: boolean;
};

export function runAdapterContract(
  buildAdapter: () => WorkspaceAdapter,
  options: ContractOptions = {},
): void {
  describe('adapter contract', () => {
    let adapter: WorkspaceAdapter;
    beforeEach(() => {
      adapter = buildAdapter();
    });

    it('implements the minimum surface', () => {
      expect(typeof adapter.healthCheck).toBe('function');
      expect(typeof adapter.syncObjects).toBe('function');
      expect(typeof adapter.exchangeCodeForTokens).toBe('function');
      expect(typeof adapter.refreshTokens).toBe('function');
      expect(typeof adapter.getCapabilities).toBe('function');
      expect(typeof adapter.getAuthorizationBaseUrl).toBe('function');
      expect(typeof adapter.getDefaultScopes).toBe('function');
    });

    it('reports capabilities', () => {
      const caps = adapter.getCapabilities();
      expect(typeof caps).toBe('object');
      expect(Array.isArray(caps.objectTypes)).toBe(true);
      expect(typeof caps.supportsOAuth).toBe('boolean');
      expect(typeof caps.supportsPat).toBe('boolean');
      expect(typeof caps.supportsDeltaSync).toBe('boolean');
      expect(typeof caps.supportsWebhooks).toBe('boolean');
    });

    it('returns a valid authorization URL', () => {
      const url = adapter.getAuthorizationBaseUrl();
      expect(typeof url).toBe('string');
      expect(url.startsWith('https://')).toBe(true);
    });

    if (options.expectDefaultScopes !== false) {
      it('has at least one default scope', () => {
        const scopes = adapter.getDefaultScopes();
        expect(Array.isArray(scopes)).toBe(true);
        expect(scopes.length).toBeGreaterThan(0);
        for (const s of scopes) {
          expect(typeof s).toBe('string');
          expect(s.length).toBeGreaterThan(0);
        }
      });
    }

    if (options.expectValidatePat === true) {
      it('implements validatePat (since the adapter declares supportsPat)', () => {
        expect(adapter.validatePat).toBeDefined();
        const caps = adapter.getCapabilities();
        expect(caps.supportsPat).toBe(true);
      });
    }

    it('rejects OAuth exchange without clientId+clientSecret', async () => {
      await expect(
        adapter.exchangeCodeForTokens('code', 'https://app/cb', undefined, {}),
      ).rejects.toThrow();
    });

    it('rejects OAuth refresh without clientId+clientSecret (if OAuth-capable)', async () => {
      const caps = adapter.getCapabilities();
      if (!caps.supportsOAuth) {
        return;
      }
      await expect(adapter.refreshTokens('rt', {})).rejects.toThrow();
    });
  });
}
