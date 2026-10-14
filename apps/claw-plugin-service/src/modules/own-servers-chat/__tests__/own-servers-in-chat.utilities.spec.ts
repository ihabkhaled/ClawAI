import { RLO, ZWSP } from './own-servers-in-chat.fixtures';
import { BREAKER_HALF_OPEN_AFTER_MS } from '../../mcp-servers/constants/mcp.constants';
import { cleanModelText } from '../utilities/clean-model-text.utility';
import { isBreakerOpen } from '../utilities/is-breaker-open.utility';
import { TtlCache } from '../utilities/ttl-cache.utility';

describe('TtlCache', () => {
  it('expires an entry after the TTL', () => {
    const cache = new TtlCache<string>(1000, 10);
    cache.set('a', 'x', 0);
    expect(cache.get('a', 999)).toBe('x');
    expect(cache.get('a', 1000)).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('drops the oldest entry when full, so memory stays bounded', () => {
    const cache = new TtlCache<number>(1000, 3);
    for (let index = 0; index < 10; index += 1) cache.set(`k${String(index)}`, index, 0);
    expect(cache.size).toBe(3);
    expect(cache.get('k0', 1)).toBeUndefined();
    expect(cache.get('k9', 1)).toBe(9);
  });

  it('refreshes the time of a key that is set again', () => {
    const cache = new TtlCache<string>(1000, 3);
    cache.set('a', 'one', 0);
    cache.set('a', 'two', 900);
    expect(cache.get('a', 1500)).toBe('two');
  });
});

describe('isBreakerOpen', () => {
  const opened = new Date(1_000_000);

  it('is closed below the failure threshold or with no open time', () => {
    expect(isBreakerOpen({ failureCount: 4, breakerOpenedAt: opened }, 1_000_001)).toBe(false);
    expect(isBreakerOpen({ failureCount: 9, breakerOpenedAt: null }, 1_000_001)).toBe(false);
  });

  it('is open for the half-open delay and closed to offers after it', () => {
    const server = { failureCount: 5, breakerOpenedAt: opened };
    expect(isBreakerOpen(server, 1_000_000 + BREAKER_HALF_OPEN_AFTER_MS - 1)).toBe(true);
    expect(isBreakerOpen(server, 1_000_000 + BREAKER_HALF_OPEN_AFTER_MS)).toBe(false);
  });
});

describe('cleanModelText', () => {
  it('removes invisible and bidi characters and folds whitespace', () => {
    expect(cleanModelText(`a${ZWSP}b${RLO}c\n\n d\t e`, 100)).toBe('abc d e');
  });

  it('keeps the Persian zero-width non-joiner and ordinary script text', () => {
    expect(cleanModelText('می‌خواهم 日本語', 100)).toBe('می‌خواهم 日本語');
  });

  it('cuts by characters, not UTF-16 units', () => {
    expect(cleanModelText('😀😀😀😀', 2)).toBe('😀😀');
  });
});
