import { canonicalJson, computeManifestHash } from '../compute-manifest-hash.utility';

describe('canonicalJson', () => {
  it('sorts keys at every level and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, 1], c: null } })).toBe(
      '{"a":{"c":null,"d":[3,1]},"b":1}',
    );
  });

  it('serialises primitives and undefined safely', () => {
    expect(canonicalJson('x')).toBe('"x"');
    expect(canonicalJson(undefined)).toBe('null');
    expect(canonicalJson(null)).toBe('null');
  });
});

describe('computeManifestHash', () => {
  it('is independent of key order', () => {
    expect(computeManifestHash({ a: 1, b: [1, 2] })).toBe(computeManifestHash({ b: [1, 2], a: 1 }));
  });

  it('changes when any value changes', () => {
    expect(computeManifestHash({ a: 1 })).not.toBe(computeManifestHash({ a: 2 }));
  });

  it('is a 64 character sha256 hex digest', () => {
    expect(computeManifestHash({})).toMatch(/^[0-9a-f]{64}$/);
  });
});
