import { compareSemver } from '../compare-semver.utility';

describe('compareSemver', () => {
  it('orders by major, minor, then patch numerically', () => {
    expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareSemver('1.0.2', '1.0.10')).toBeLessThan(0);
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
  });

  it('treats an unparseable version as 0.0.0', () => {
    expect(compareSemver('banana', '0.0.0')).toBe(0);
    expect(compareSemver('1.0.0', 'banana')).toBeGreaterThan(0);
  });
});
