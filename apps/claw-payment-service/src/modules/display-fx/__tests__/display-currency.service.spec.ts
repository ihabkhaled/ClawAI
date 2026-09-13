import { CurrencyPreferenceMode, DisplayFxSource, GeoCountrySource } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { DisplayCurrencyService } from '../services/display-currency.service';
import { type DisplayFxService } from '../services/display-fx.service';
import { type GeoCountryService } from '../services/geo-country.service';

const RATE_SCALE = 10_000_000;

function configure(overrides: Record<string, string> = {}): void {
  jest.spyOn(AppConfig, 'get').mockReturnValue({
    DISPLAY_FX_ENABLED: 'true',
    DISPLAY_FX_GEO_ENABLED: 'true',
    ...overrides,
  } as unknown as ReturnType<typeof AppConfig.get>);
}

function buildGeo(countryCode: string | null): GeoCountryService {
  return {
    resolve: jest.fn().mockResolvedValue({
      countryCode,
      source: countryCode === null ? GeoCountrySource.UNRESOLVED : GeoCountrySource.IP_LOOKUP,
    }),
  } as unknown as GeoCountryService;
}

function buildFx(rateScaled: number | null): DisplayFxService {
  return {
    getRate: jest.fn().mockImplementation((currency: string) =>
      Promise.resolve(
        rateScaled === null
          ? null
          : {
              baseCurrency: 'USD',
              quoteCurrency: currency,
              rateScaled,
              asOf: '2026-09-11',
              source: DisplayFxSource.FRANKFURTER,
            },
      ),
    ),
  } as unknown as DisplayFxService;
}

describe('DisplayCurrencyService', () => {
  beforeEach(() => {
    configure();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('the product promises', () => {
    it('shows an Egyptian visitor EGP', async () => {
      const service = new DisplayCurrencyService(buildGeo('EG'), buildFx(51 * RATE_SCALE));
      const context = await service.resolve({ headers: {} });

      expect(context.currencyCode).toBe('EGP');
      expect(context.countryCode).toBe('EG');
      expect(context.mode).toBe(CurrencyPreferenceMode.AUTO);
      expect(context.fx?.rateScaled).toBe(51 * RATE_SCALE);
    });

    it('shows a German visitor EUR and a UAE visitor AED', async () => {
      const german = new DisplayCurrencyService(buildGeo('DE'), buildFx(9_000_000));
      expect((await german.resolve({ headers: {} })).currencyCode).toBe('EUR');

      const emirati = new DisplayCurrencyService(buildGeo('AE'), buildFx(36_700_000));
      expect((await emirati.resolve({ headers: {} })).currencyCode).toBe('AED');
    });

    it('shows an unknown visitor USD', async () => {
      const service = new DisplayCurrencyService(buildGeo(null), buildFx(null));
      const context = await service.resolve({ headers: {} });

      expect(context.currencyCode).toBe('USD');
      expect(context.fx).toBeNull();
    });

    it('does not call for a rate when the currency is already USD', async () => {
      const fx = buildFx(51 * RATE_SCALE);
      const service = new DisplayCurrencyService(buildGeo('US'), fx);
      await service.resolve({ headers: {} });

      expect(fx.getRate).not.toHaveBeenCalled();
    });
  });

  describe('precedence', () => {
    it('lets a saved MANUAL choice beat geolocation', async () => {
      // If the IP says Egypt and the user asked for euros, they get euros. The
      // visitor knows where they are better than an IP database does.
      const geo = buildGeo('EG');
      const service = new DisplayCurrencyService(geo, buildFx(9_000_000));
      const context = await service.resolve({
        headers: {},
        preferenceMode: CurrencyPreferenceMode.MANUAL,
        preferredCurrencyCode: 'EUR',
      });

      expect(context.currencyCode).toBe('EUR');
      expect(context.mode).toBe(CurrencyPreferenceMode.MANUAL);
      expect(context.countrySource).toBe(GeoCountrySource.USER_PREFERENCE);
      expect(geo.resolve).not.toHaveBeenCalled();
    });

    it('lets an anonymous cookie choice beat geolocation', async () => {
      const service = new DisplayCurrencyService(buildGeo('EG'), buildFx(9_000_000));
      const context = await service.resolve({ headers: {}, anonymousCurrencyCode: 'eur' });

      expect(context.currencyCode).toBe('EUR');
      expect(context.countrySource).toBe(GeoCountrySource.ANONYMOUS_PREFERENCE);
    });

    it('lets a user force USD and stay there', async () => {
      const service = new DisplayCurrencyService(buildGeo('EG'), buildFx(51 * RATE_SCALE));
      const context = await service.resolve({
        headers: {},
        preferenceMode: CurrencyPreferenceMode.MANUAL,
        preferredCurrencyCode: 'USD',
      });

      expect(context.currencyCode).toBe('USD');
      expect(context.fx).toBeNull();
    });

    it('re-detects on every visit in AUTO, ignoring a stored country', async () => {
      // AUTO means "wherever I am now". A stored country is context, not a
      // freeze, or a user who moved would be stuck forever.
      const service = new DisplayCurrencyService(buildGeo('DE'), buildFx(9_000_000));
      const context = await service.resolve({
        headers: {},
        preferenceMode: CurrencyPreferenceMode.AUTO,
        preferredCountryCode: 'EG',
      });

      expect(context.countryCode).toBe('DE');
      expect(context.currencyCode).toBe('EUR');
    });

    it('uses the browser hint only when nothing better resolved', async () => {
      const service = new DisplayCurrencyService(buildGeo(null), buildFx(51 * RATE_SCALE));
      const context = await service.resolve({ headers: {}, clientCountryHint: 'eg' });

      expect(context.currencyCode).toBe('EGP');
      expect(context.countrySource).toBe(GeoCountrySource.CLIENT_HINT);
    });

    it('resolves a browser time zone to a country', async () => {
      // The case that makes AUTO work at all on a local install or behind a
      // NAT: the request never crossed the internet, so the address is private,
      // the geo lookup correctly declines, and the time zone is all that is
      // left. Without this, AUTO always meant USD on those deployments.
      const service = new DisplayCurrencyService(buildGeo(null), buildFx(51 * RATE_SCALE));
      const context = await service.resolve({
        headers: {},
        clientCountryHint: 'Africa/Cairo',
      });

      expect(context.countryCode).toBe('EG');
      expect(context.currencyCode).toBe('EGP');
      expect(context.countrySource).toBe(GeoCountrySource.CLIENT_HINT);
    });

    it('lets a real geolocation beat the time zone', async () => {
      // A laptop still set to Europe/London that is demonstrably in Egypt
      // should follow the address, not the clock.
      const service = new DisplayCurrencyService(buildGeo('EG'), buildFx(51 * RATE_SCALE));
      const context = await service.resolve({
        headers: {},
        clientCountryHint: 'Europe/London',
      });

      expect(context.countryCode).toBe('EG');
      expect(context.countrySource).toBe(GeoCountrySource.IP_LOOKUP);
    });

    it('ignores an unplaceable time zone rather than guessing', async () => {
      const service = new DisplayCurrencyService(buildGeo(null), buildFx(51 * RATE_SCALE));
      const context = await service.resolve({
        headers: {},
        clientCountryHint: 'Mars/Olympus',
      });

      expect(context.currencyCode).toBe('USD');
      expect(context.countrySource).toBe(GeoCountrySource.UNRESOLVED);
    });
  });
});

describe('DisplayCurrencyService degradation', () => {
  beforeEach(() => {
    configure();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('falls back to USD when no provider can quote the detected currency', async () => {
    // The canonical price is still valid. Only the conversion is missing.
    const service = new DisplayCurrencyService(buildGeo('EG'), buildFx(null));
    const context = await service.resolve({ headers: {} });

    expect(context.currencyCode).toBe('USD');
    expect(context.fx).toBeNull();
  });

  it('keeps a MANUAL preference intact when its currency is temporarily unquotable', async () => {
    // Clearing someone's saved setting because an upstream had a bad morning
    // is a worse answer than showing them dollars for a day.
    const service = new DisplayCurrencyService(buildGeo('US'), buildFx(null));
    const context = await service.resolve({
      headers: {},
      preferenceMode: CurrencyPreferenceMode.MANUAL,
      preferredCurrencyCode: 'NGN',
    });

    expect(context.currencyCode).toBe('USD');
    expect(context.mode).toBe(CurrencyPreferenceMode.MANUAL);
  });

  it('ignores a MANUAL preference whose currency is no longer supported', async () => {
    const geo = buildGeo('EG');
    const service = new DisplayCurrencyService(geo, buildFx(51 * RATE_SCALE));
    const context = await service.resolve({
      headers: {},
      preferenceMode: CurrencyPreferenceMode.MANUAL,
      preferredCurrencyCode: 'ZWL',
    });

    // Detection takes over rather than the page breaking.
    expect(context.currencyCode).toBe('EGP');
  });

  it('rejects a tampered anonymous currency without failing the request', async () => {
    const service = new DisplayCurrencyService(buildGeo('EG'), buildFx(51 * RATE_SCALE));
    for (const value of ['BTC', 'ZZZ', '<script>', 'A'.repeat(500), '']) {
      const context = await service.resolve({ headers: {}, anonymousCurrencyCode: value });
      expect(context.currencyCode).toBe('EGP');
    }
  });

  it('renders an ordinary USD site when the kill switch is off', async () => {
    // The OFF state is the rollback lever and the one state QA never runs.
    configure({ DISPLAY_FX_ENABLED: 'false' });
    const geo = buildGeo('EG');
    const fx = buildFx(51 * RATE_SCALE);
    const service = new DisplayCurrencyService(geo, fx);
    const context = await service.resolve({
      headers: {},
      preferenceMode: CurrencyPreferenceMode.MANUAL,
      preferredCurrencyCode: 'EGP',
    });

    expect(context.currencyCode).toBe('USD');
    expect(context.fx).toBeNull();
    expect(geo.resolve).not.toHaveBeenCalled();
    expect(fx.getRate).not.toHaveBeenCalled();
  });

  it('keeps manual selection working when geolocation alone is disabled', async () => {
    configure({ DISPLAY_FX_GEO_ENABLED: 'false' });
    const geo = buildGeo('EG');
    const service = new DisplayCurrencyService(geo, buildFx(51 * RATE_SCALE));

    expect((await service.resolve({ headers: {} })).currencyCode).toBe('USD');
    expect(geo.resolve).not.toHaveBeenCalled();
    expect(
      (await service.resolve({ headers: {}, anonymousCurrencyCode: 'EGP' })).currencyCode,
    ).toBe('EGP');
  });
});
