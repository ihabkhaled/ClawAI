import { BoundedTtlCache } from '../utilities/bounded-ttl-cache.utility';

describe('BoundedTtlCache', () => {
  it('returns a value until it expires', () => {
    let now = 1000;
    const cache = new BoundedTtlCache<string>(60_000, 10, () => now);
    cache.set('a', 'A');
    expect(cache.get('a')).toBe('A');
    now += 59_999;
    expect(cache.get('a')).toBe('A');
    now += 1;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('drops the oldest entries past the bound', () => {
    const cache = new BoundedTtlCache<number>(60_000, 3);
    for (let i = 0; i < 10; i += 1) cache.set(`k${String(i)}`, i);
    expect(cache.size).toBe(3);
    expect(cache.get('k0')).toBeUndefined();
    expect(cache.get('k9')).toBe(9);
  });

  it('refreshing a key keeps it and ages out another instead', () => {
    const cache = new BoundedTtlCache<number>(60_000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 3);
    cache.set('c', 4);
    expect(cache.get('a')).toBe(3);
    expect(cache.get('b')).toBeUndefined();
  });
});
