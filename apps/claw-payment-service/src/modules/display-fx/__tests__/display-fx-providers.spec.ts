import { httpRequest, normalizeDisplayCurrency } from '@claw/shared-utilities';
import { DisplayFxSource } from '@claw/shared-types';

import { FawazExchangeProvider } from '../providers/fawaz-exchange.provider';
import { FrankfurterProvider } from '../providers/frankfurter.provider';

jest.mock('@claw/shared-utilities', () => ({
  ...jest.requireActual('@claw/shared-utilities'),
  httpRequest: jest.fn(),
}));

const mockHttp = httpRequest as unknown as jest.Mock;
const RATE_SCALE = 10_000_000;

const ok = (data: unknown) => ({ ok: true, status: 200, data });
const fail = (status: number) => ({ ok: false, status, data: null });

describe('FrankfurterProvider', () => {
  const provider = new FrankfurterProvider();

  beforeEach(() => {
    mockHttp.mockReset();
  });

  it('returns a scaled rate from a well-formed response', async () => {
    mockHttp.mockResolvedValue(ok({ base: 'USD', date: '2026-09-11', rates: { EGP: 51.283 } }));
    const result = await provider.fetchRate('USD', 'EGP');
    expect(result).toEqual({
      rateScaled: 512_830_000,
      asOf: '2026-09-11',
      source: DisplayFxSource.FRANKFURTER,
    });
  });

  it('never touches the network with an unvalidated code', async () => {
    mockHttp.mockResolvedValue(ok({ base: 'USD', date: '2026-09-11', rates: { EGP: 51 } }));
    await provider.fetchRate('USD', 'EGP');
    const url = (mockHttp.mock.calls[0]?.[0] as { url: string }).url;
    expect(url).toContain('base=USD');
    expect(url).toContain('symbols=EGP');
    expect(url.startsWith('https://api.frankfurter.dev/')).toBe(true);
  });

  it('refuses a response that answers for a different base currency', async () => {
    // A rate for the wrong pair prices against the wrong question.
    mockHttp.mockResolvedValue(ok({ base: 'EUR', date: '2026-09-11', rates: { EGP: 55 } }));
    expect(await provider.fetchRate('USD', 'EGP')).toBeNull();
  });

  it('returns null for an unsupported quote currency', async () => {
    // Not an error. It is the reason the fallback provider exists.
    mockHttp.mockResolvedValue(ok({ base: 'USD', date: '2026-09-11', rates: { EUR: 0.9 } }));
    expect(await provider.fetchRate('USD', 'NGN')).toBeNull();
  });

  it('returns null for a malformed body', async () => {
    for (const body of [null, {}, { base: 'USD' }, { rates: 'nope' }, [1, 2, 3], 'text']) {
      mockHttp.mockResolvedValue(ok(body));
      expect(await provider.fetchRate('USD', 'EGP')).toBeNull();
    }
  });

  it('returns null for an impossible rate', async () => {
    for (const rate of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      mockHttp.mockResolvedValue(ok({ base: 'USD', date: '2026-09-11', rates: { EGP: rate } }));
      expect(await provider.fetchRate('USD', 'EGP')).toBeNull();
    }
  });

  it('returns null on a non-2xx, a timeout and a thrown transport error', async () => {
    mockHttp.mockResolvedValue(fail(503));
    expect(await provider.fetchRate('USD', 'EGP')).toBeNull();
    mockHttp.mockResolvedValue(fail(429));
    expect(await provider.fetchRate('USD', 'EGP')).toBeNull();
    mockHttp.mockRejectedValue(new Error('aborted'));
    expect(await provider.fetchRate('USD', 'EGP')).toBeNull();
  });

  it('bounds how long it will wait', async () => {
    mockHttp.mockResolvedValue(ok({ base: 'USD', date: '2026-09-11', rates: { EGP: 51 } }));
    await provider.fetchRate('USD', 'EGP');
    const options = mockHttp.mock.calls[0]?.[0] as { timeoutMs: number };
    expect(options.timeoutMs).toBeLessThanOrEqual(2_000);
  });
});

describe('FawazExchangeProvider', () => {
  const provider = new FawazExchangeProvider();

  beforeEach(() => {
    mockHttp.mockReset();
  });

  it('reads the rate out of the lowercase nested table', async () => {
    mockHttp.mockResolvedValue(ok({ date: '2026-09-11', usd: { egp: 51.283, eur: 0.9 } }));
    const result = await provider.fetchRate('USD', 'EGP');
    expect(result).toEqual({
      rateScaled: 512_830_000,
      asOf: '2026-09-11',
      source: DisplayFxSource.FAWAZ_EXCHANGE_API,
    });
  });

  it('tries the CDN first and the documented mirror second', async () => {
    // The two URLs are TRANSPORT mirrors of one source, so this is a retry, not
    // a second opinion about the rate.
    mockHttp
      .mockResolvedValueOnce(fail(502))
      .mockResolvedValueOnce(ok({ date: '2026-09-11', usd: { egp: 51 } }));
    const result = await provider.fetchRate('USD', 'EGP');
    expect(result?.rateScaled).toBe(51 * RATE_SCALE);
    expect(mockHttp).toHaveBeenCalledTimes(2);
    const first = (mockHttp.mock.calls[0]?.[0] as { url: string }).url;
    const second = (mockHttp.mock.calls[1]?.[0] as { url: string }).url;
    expect(first).toContain('cdn.jsdelivr.net');
    expect(second).toContain('currency-api.pages.dev');
  });

  it('does not call the mirror when the CDN answered', async () => {
    mockHttp.mockResolvedValue(ok({ date: '2026-09-11', usd: { egp: 51 } }));
    await provider.fetchRate('USD', 'EGP');
    expect(mockHttp).toHaveBeenCalledTimes(1);
  });

  it('returns null when both transports fail', async () => {
    mockHttp.mockRejectedValue(new Error('network down'));
    expect(await provider.fetchRate('USD', 'EGP')).toBeNull();
    expect(mockHttp).toHaveBeenCalledTimes(2);
  });

  it('returns null for a malformed body or a missing table', async () => {
    for (const body of [null, {}, { date: '2026-09-11' }, { date: '2026-09-11', usd: 'nope' }]) {
      mockHttp.mockResolvedValue(ok(body));
      expect(await provider.fetchRate('USD', 'EGP')).toBeNull();
    }
  });

  it('returns null for an impossible rate', async () => {
    mockHttp.mockResolvedValue(ok({ date: '2026-09-11', usd: { egp: 0 } }));
    expect(await provider.fetchRate('USD', 'EGP')).toBeNull();
    mockHttp.mockResolvedValue(ok({ date: '2026-09-11', usd: { egp: -3 } }));
    expect(await provider.fetchRate('USD', 'EGP')).toBeNull();
  });

  it('is not the thing that keeps crypto out', async () => {
    // The payload carries two hundred assets including BTC, and this adapter
    // would happily read one. The gate is upstream: the display allowlist
    // decides what ClawAI is willing to show, and a code that fails it never
    // reaches a provider at all.
    expect(normalizeDisplayCurrency('BTC')).toBeNull();
    expect(normalizeDisplayCurrency('XAU')).toBeNull();
    expect(normalizeDisplayCurrency('EGP')).toBe('EGP');
  });
});
