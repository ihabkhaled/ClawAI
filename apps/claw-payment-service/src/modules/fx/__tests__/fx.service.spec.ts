import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { FxService } from '../services/fx.service';
import { type FxQuoteRepository } from '../repositories/fx-quote.repository';

jest.mock('@claw/shared-utilities', () => ({
  ...jest.requireActual('@claw/shared-utilities'),
  httpRequest: jest.fn(),
}));

const mockHttp = httpRequest as unknown as jest.Mock;
const NOW = 1_800_000_000_000;
const RATE_SCALE = 10_000_000;

const storedQuote = (overrides: Record<string, unknown> = {}) => ({
  id: 'fx1',
  baseCurrency: 'USD',
  quoteCurrency: 'EGP',
  sourceRateScaled: BigInt(48 * RATE_SCALE),
  safetyMarginBps: 100,
  finalRateScaled: BigInt(48 * RATE_SCALE),
  source: 'API',
  fetchedAt: new Date(NOW),
  expiresAt: new Date(NOW + 600_000),
  createdAt: new Date(NOW),
  ...overrides,
});

describe('FxService', () => {
  let service: FxService;
  let repository: { findFresh: jest.Mock; findById: jest.Mock; create: jest.Mock };

  beforeEach(() => {
    mockHttp.mockReset();
    repository = {
      findFresh: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((data: Record<string, unknown>) =>
          Promise.resolve({ id: 'fx-new', createdAt: new Date(NOW), ...data }),
        ),
    };
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      EXCHANGE_RATE_API_BASE_URL: 'https://rates.example/v1',
      FX_QUOTE_TTL_MS: 600_000,
      FX_SAFETY_MARGIN_BPS: 100,
      USD_TO_EGP_FALLBACK_RATE: '0',
      PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
    } as unknown as ReturnType<typeof AppConfig.get>);
    service = new FxService(repository as unknown as FxQuoteRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('short-circuits when base and quote currency are the same', async () => {
    const result = await service.quote(2000, 'USD', 'USD', NOW);
    expect(result.convertedAmountMinor).toBe(2000);
    expect(mockHttp).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('fetches a rate, applies the safety margin, and persists the quote', async () => {
    mockHttp.mockResolvedValue({ ok: true, status: 200, data: { rates: { EGP: '48.00' } } });
    const result = await service.quote(2000, 'USD', 'EGP', NOW);
    expect(mockHttp).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://rates.example/v1/latest/USD' }),
    );
    // 48.00 + 100bps = 48.48, so $20.00 becomes 969.60 EGP => 96960 piastres.
    expect(result.finalRateScaled).toBe(Math.round(48.48 * RATE_SCALE));
    expect(result.convertedAmountMinor).toBe(96_960);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('quotes slightly high rather than absorbing an FX loss', async () => {
    mockHttp.mockResolvedValue({ ok: true, status: 200, data: { rates: { EGP: '48.00' } } });
    const result = await service.quote(2000, 'USD', 'EGP', NOW);
    expect(result.finalRateScaled).toBeGreaterThan(result.sourceRateScaled);
  });

  it('reuses a cached quote instead of re-fetching', async () => {
    repository.findFresh.mockResolvedValue(storedQuote());
    const result = await service.quote(2000, 'USD', 'EGP', NOW);
    expect(mockHttp).not.toHaveBeenCalled();
    expect(result.quoteId).toBe('fx1');
    expect(result.convertedAmountMinor).toBe(96_000);
  });

  it('falls back to the configured rate when the upstream is unreachable', async () => {
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      EXCHANGE_RATE_API_BASE_URL: 'https://rates.example/v1',
      FX_QUOTE_TTL_MS: 600_000,
      FX_SAFETY_MARGIN_BPS: 0,
      USD_TO_EGP_FALLBACK_RATE: '50.00',
      PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
    } as unknown as ReturnType<typeof AppConfig.get>);
    mockHttp.mockRejectedValue(new Error('network down'));
    const result = await service.quote(2000, 'USD', 'EGP', NOW);
    expect(result.source).toBe('FALLBACK');
    expect(result.convertedAmountMinor).toBe(100_000);
  });

  it('REFUSES to quote when the upstream fails and no fallback is configured', async () => {
    // A zero fallback is an explicit instruction to fail the checkout rather
    // than charge at a rate nobody has verified.
    mockHttp.mockRejectedValue(new Error('network down'));
    await expect(service.quote(2000, 'USD', 'EGP', NOW)).rejects.toThrow();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('refuses when the upstream omits the requested currency', async () => {
    mockHttp.mockResolvedValue({ ok: true, status: 200, data: { rates: { GBP: '0.8' } } });
    await expect(service.quote(2000, 'USD', 'EGP', NOW)).rejects.toThrow();
  });

  it('refuses when the upstream payload fails schema validation', async () => {
    mockHttp.mockResolvedValue({ ok: true, status: 200, data: { nonsense: true } });
    await expect(service.quote(2000, 'USD', 'EGP', NOW)).rejects.toThrow();
  });

  it('never uses a fallback for a currency it was not configured for', async () => {
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      EXCHANGE_RATE_API_BASE_URL: 'https://rates.example/v1',
      FX_QUOTE_TTL_MS: 600_000,
      FX_SAFETY_MARGIN_BPS: 0,
      USD_TO_EGP_FALLBACK_RATE: '50.00',
      PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
    } as unknown as ReturnType<typeof AppConfig.get>);
    mockHttp.mockRejectedValue(new Error('down'));
    await expect(service.quote(2000, 'USD', 'GBP', NOW)).rejects.toThrow();
  });

  describe('requireFresh', () => {
    it('accepts an unexpired quote', async () => {
      repository.findById.mockResolvedValue(storedQuote());
      await expect(service.requireFresh('fx1', NOW)).resolves.toBeUndefined();
    });

    it('rejects an expired quote', async () => {
      repository.findById.mockResolvedValue(storedQuote({ expiresAt: new Date(NOW - 1) }));
      await expect(service.requireFresh('fx1', NOW)).rejects.toThrow();
    });

    it('rejects a quote that does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.requireFresh('missing', NOW)).rejects.toThrow();
    });

    it('rejects exactly at the expiry instant', async () => {
      repository.findById.mockResolvedValue(storedQuote({ expiresAt: new Date(NOW) }));
      await expect(service.requireFresh('fx1', NOW)).rejects.toThrow();
    });
  });
});
