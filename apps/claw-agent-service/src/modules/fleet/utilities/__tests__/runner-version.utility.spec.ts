import { compareRunnerVersions, parseRunnerVersion } from '../runner-version.utility';

function order(left: string, right: string): number {
  const a = parseRunnerVersion(left);
  const b = parseRunnerVersion(right);
  if (a === null || b === null) throw new Error(`unparsable: ${left} / ${right}`);
  return Math.sign(compareRunnerVersions(a, b));
}

describe('parseRunnerVersion', () => {
  it('reads plain, v-prefixed, prerelease and build-metadata versions', () => {
    expect(parseRunnerVersion('1.92.0')).toEqual({ major: 1, minor: 92, patch: 0, prerelease: [] });
    expect(parseRunnerVersion('v1.92.0')).toEqual({
      major: 1,
      minor: 92,
      patch: 0,
      prerelease: [],
    });
    expect(parseRunnerVersion('V2.0.1')?.major).toBe(2);
    expect(parseRunnerVersion('1.93.0-beta.1')?.prerelease).toEqual(['beta', '1']);
    expect(parseRunnerVersion('1.92.0+build.7')?.prerelease).toEqual([]);
    expect(parseRunnerVersion('  1.2.3  ')?.patch).toBe(3);
  });

  it.each(['', 'abc', '1', '1.2', '1.2.3.4', '1.2.x', '-1.2.3', '1.2.3-', 'latest', '1.2.3 beta'])(
    'returns null for junk %j',
    (junk) => {
      expect(parseRunnerVersion(junk)).toBeNull();
    },
  );

  it('rejects absurdly long numeric parts instead of losing precision', () => {
    expect(parseRunnerVersion('1234567890123.0.0')).toBeNull();
  });
});

describe('compareRunnerVersions', () => {
  it('orders by major, minor, patch', () => {
    expect(order('1.0.0', '2.0.0')).toBe(-1);
    expect(order('1.10.0', '1.9.0')).toBe(1);
    expect(order('1.2.10', '1.2.9')).toBe(1);
    expect(order('1.2.3', '1.2.3')).toBe(0);
  });

  it('treats the v prefix and build metadata as irrelevant', () => {
    expect(order('v1.2.3', '1.2.3')).toBe(0);
    expect(order('1.2.3+a', '1.2.3+b')).toBe(0);
  });

  it('puts a prerelease below its release and above the previous release', () => {
    expect(order('1.93.0-beta.1', '1.93.0')).toBe(-1);
    expect(order('1.93.0-beta.1', '1.92.9')).toBe(1);
  });

  it('orders prerelease identifiers as semver does', () => {
    expect(order('1.0.0-alpha', '1.0.0-alpha.1')).toBe(-1);
    expect(order('1.0.0-alpha.1', '1.0.0-alpha.beta')).toBe(-1);
    expect(order('1.0.0-alpha.beta', '1.0.0-beta')).toBe(-1);
    expect(order('1.0.0-beta.2', '1.0.0-beta.11')).toBe(-1);
    expect(order('1.0.0-rc.1', '1.0.0-beta.11')).toBe(1);
  });
});
