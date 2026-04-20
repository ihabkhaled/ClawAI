import type { SearchAdapter } from '../search-adapter.interface';

/**
 * Every search adapter implementation calls `runSearchAdapterContract`
 * in its spec so the minimum surface is exercised consistently.
 */
export function runSearchAdapterContract(build: () => SearchAdapter): void {
  describe('search adapter contract', () => {
    let adapter: SearchAdapter;
    beforeEach(() => {
      adapter = build();
    });

    it('declares a SearchProviderKind', () => {
      expect(typeof adapter.kind).toBe('string');
      expect(adapter.kind.length).toBeGreaterThan(0);
    });

    it('implements search and healthCheck', () => {
      expect(typeof adapter.search).toBe('function');
      expect(typeof adapter.healthCheck).toBe('function');
    });
  });
}
