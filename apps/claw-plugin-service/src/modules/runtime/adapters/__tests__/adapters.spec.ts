import { AdapterFailureKind } from '../../../../common/enums/adapter-failure-kind.enum';
import { EgressErrorCode } from '../../../../common/enums/egress-error-code.enum';
import { EgressError } from '../../../egress/errors/egress.error';
import { SafeEgressManager } from '../../../egress/managers/safe-egress.manager';
import {
  okReply,
  publicResolver,
  RecordingTransport,
  redirectReply,
  ScriptedResolver,
} from '../../../egress/__tests__/egress-test-doubles';
import { EgressTransport } from '../../../egress/transports/egress.transport';
import { type EgressSendInput, type EgressSendResult } from '../../../egress/types/egress.types';
import { AdapterError } from '../../errors/adapter.error';
import { type AdapterContext } from '../../types/plugin-adapter.types';
import { DatetimeMathAdapter } from '../datetime-math.adapter';
import { WeatherAdapter } from '../weather.adapter';
import { WebFetchAdapter } from '../web-fetch.adapter';

function context(overrides: Partial<AdapterContext> = {}): AdapterContext {
  return {
    userId: 'user-1',
    settings: {},
    signal: new AbortController().signal,
    allowedHosts: new Set<string>(),
    timeoutMs: 5000,
    maxResultBytes: 65_536,
    ...overrides,
  };
}

async function failureOf(promise: Promise<unknown>): Promise<AdapterError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AdapterError) return error;
    throw error;
  }
  throw new Error('expected an AdapterError');
}

describe('WebFetchAdapter', () => {
  const page = (body: string, type = 'text/html') => okReply(body, { 'content-type': type });
  const build = (replies: EgressSendResult[], resolver = publicResolver()) => {
    const transport = new RecordingTransport(replies);
    return { adapter: new WebFetchAdapter(new SafeEgressManager(resolver, transport)), transport };
  };

  it('returns the readable text of a public page', async () => {
    const { adapter, transport } = build([page('<title>T</title><p>Hello <b>world</b></p>')]);

    const result = await adapter.execute(context(), 'fetch_page', { url: 'https://example.com/a' });

    expect(result.content).toBe('T\n\nHello world');
    expect(transport.sent[0]).toMatchObject({
      host: 'example.com',
      port: 443,
      method: 'GET',
      path: '/a',
    });
  });

  it('sends only its own headers', async () => {
    const { adapter, transport } = build([page('x', 'text/plain')]);

    await adapter.execute(context(), 'fetch_page', { url: 'https://example.com/' });

    expect(Object.keys(transport.sent[0]?.headers ?? {}).sort()).toEqual(['Accept', 'User-Agent']);
  });

  it('follows a redirect to another public host and re-pins it', async () => {
    const { adapter, transport } = build([
      redirectReply('https://www.example.com/'),
      page('moved', 'text/plain'),
    ]);

    const result = await adapter.execute(context(), 'fetch_page', { url: 'https://example.com/' });

    expect(result.content).toBe('moved');
    expect(transport.sent.map((sent) => sent.host)).toEqual(['example.com', 'www.example.com']);
  });

  it.each([
    'http://example.com/',
    'https://127.0.0.1/',
    'https://localhost/admin',
    'https://169.254.169.254/latest/meta-data/',
    'https://example.com:8443/',
    'https://user:pw@example.com/',
    'file:///etc/passwd',
  ])('gives the same refusal for %s and never reaches the wire', async (url) => {
    const { adapter, transport } = build([page('x')]);

    const failure = await failureOf(adapter.execute(context(), 'fetch_page', { url }));

    expect(failure.message).toBe(
      'The page could not be fetched. Only public https pages can be read.',
    );
    expect(transport.sent).toHaveLength(0);
  });

  it('refuses a name that resolves to a private address with the same message', async () => {
    const { adapter, transport } = build([page('x')], new ScriptedResolver(() => ['10.0.0.5']));

    const failure = await failureOf(
      adapter.execute(context(), 'fetch_page', { url: 'https://intranet.example.com/' }),
    );

    expect(failure.message).toContain('could not be fetched');
    expect(failure.message).not.toContain('10.0.0.5');
    expect(transport.sent).toHaveLength(0);
  });

  it('refuses a redirect to a private address with the same message', async () => {
    const { adapter } = build([redirectReply('https://10.0.0.5/')]);

    const failure = await failureOf(
      adapter.execute(context(), 'fetch_page', { url: 'https://example.com/' }),
    );

    expect(failure.message).toContain('could not be fetched');
  });

  it('reports a timeout as a timeout', async () => {
    class SlowTransport extends EgressTransport {
      send(_input: EgressSendInput): Promise<EgressSendResult> {
        return Promise.reject(new EgressError(EgressErrorCode.TIMEOUT));
      }
    }
    const adapter = new WebFetchAdapter(
      new SafeEgressManager(publicResolver(), new SlowTransport()),
    );

    const failure = await failureOf(
      adapter.execute(context(), 'fetch_page', { url: 'https://example.com/' }),
    );

    expect(failure.kind).toBe(AdapterFailureKind.TIMEOUT);
  });

  it('refuses a non-text page, an error status and a bad call', async () => {
    const pdf = build([page('%PDF', 'application/pdf')]);
    const missing = build([{ ...page('nope'), status: 404 }]);

    expect(
      (
        await failureOf(
          pdf.adapter.execute(context(), 'fetch_page', { url: 'https://example.com/a.pdf' }),
        )
      ).message,
    ).toContain('not text');
    expect(
      (
        await failureOf(
          missing.adapter.execute(context(), 'fetch_page', { url: 'https://example.com/x' }),
        )
      ).message,
    ).toContain('HTTP 404');
    expect(
      (await failureOf(pdf.adapter.execute(context(), 'other', { url: 'https://example.com/' })))
        .kind,
    ).toBe(AdapterFailureKind.BAD_INPUT);
    expect((await failureOf(pdf.adapter.execute(context(), 'fetch_page', { url: 42 }))).kind).toBe(
      AdapterFailureKind.BAD_INPUT,
    );
  });

  it('reports a page it had to cut', async () => {
    const { adapter } = build([{ ...page('partial', 'text/plain'), truncated: true }]);

    expect(
      (await adapter.execute(context(), 'fetch_page', { url: 'https://example.com/' })).truncated,
    ).toBe(true);
  });
});

describe('WeatherAdapter', () => {
  const HOSTS = new Set(['api.open-meteo.com', 'geocoding-api.open-meteo.com']);
  const geocode = JSON.stringify({
    results: [
      {
        name: 'Cairo',
        country: 'Egypt',
        admin1: 'Cairo Governorate',
        latitude: 30.04,
        longitude: 31.24,
      },
    ],
  });
  const forecast = JSON.stringify({
    current: {
      temperature_2m: 30,
      apparent_temperature: 31,
      relative_humidity_2m: 20,
      precipitation: 0,
      wind_speed_10m: 9,
      weather_code: 0,
    },
    daily: {
      time: ['2026-10-14'],
      weather_code: [0],
      temperature_2m_max: [32],
      temperature_2m_min: [20],
      precipitation_sum: [0],
    },
  });
  const build = (replies: EgressSendResult[]) => {
    const transport = new RecordingTransport(replies);
    return {
      adapter: new WeatherAdapter(new SafeEgressManager(publicResolver(), transport)),
      transport,
    };
  };

  it('geocodes the place, then asks for the forecast, both on the manifest hosts', async () => {
    const { adapter, transport } = build([okReply(geocode), okReply(forecast)]);

    const result = await adapter.execute(context({ allowedHosts: HOSTS }), 'get_weather', {
      location: 'Cairo',
      days: 2,
    });

    expect(result.content).toContain('Weather for Cairo, Cairo Governorate, Egypt');
    expect(result.content).toContain('clear sky, 30°C');
    expect(transport.sent.map((sent) => sent.host)).toEqual([
      'geocoding-api.open-meteo.com',
      'api.open-meteo.com',
    ]);
    expect(transport.sent[0]?.path).toContain('name=Cairo');
    expect(transport.sent[1]?.path).toContain('forecast_days=2');
  });

  it('puts the place name in the query only, encoded, never in the host or path', async () => {
    const { adapter, transport } = build([okReply(geocode), okReply(forecast)]);

    await adapter.execute(context({ allowedHosts: HOSTS }), 'get_weather', {
      location: '../evil.example/?x=1&host=169.254.169.254',
    });

    expect(transport.sent[0]?.host).toBe('geocoding-api.open-meteo.com');
    expect(transport.sent[0]?.path.startsWith('/v1/search?name=')).toBe(true);
    expect(transport.sent[0]?.path).not.toContain('&host=');
  });

  it('uses imperial units when the install asks for them', async () => {
    const { adapter, transport } = build([okReply(geocode), okReply(forecast)]);

    const result = await adapter.execute(
      context({ allowedHosts: HOSTS, settings: { units: 'imperial' } }),
      'get_weather',
      { location: 'Cairo' },
    );

    expect(transport.sent[1]?.path).toContain('temperature_unit=fahrenheit');
    expect(result.content).toContain('°F');
  });

  it('clamps the forecast days to 1..7 and defaults to 3', async () => {
    const days = async (value: unknown): Promise<string> => {
      const { adapter, transport } = build([okReply(geocode), okReply(forecast)]);
      await adapter.execute(context({ allowedHosts: HOSTS }), 'get_weather', {
        location: 'Cairo',
        days: value,
      });
      return transport.sent[1]?.path ?? '';
    };

    expect(await days(99)).toContain('forecast_days=7');
    expect(await days(0)).toContain('forecast_days=1');
    expect(await days(undefined)).toContain('forecast_days=3');
    expect(await days(2.5)).toContain('forecast_days=3');
  });

  it('says so when no place matches', async () => {
    const { adapter } = build([okReply('{}')]);

    const failure = await failureOf(
      adapter.execute(context({ allowedHosts: HOSTS }), 'get_weather', { location: 'Nowhere' }),
    );

    expect(failure.kind).toBe(AdapterFailureKind.BAD_INPUT);
    expect(failure.message).toContain('No place was found');
  });

  it('reports the service as unavailable on a bad status, bad JSON or an unexpected shape', async () => {
    for (const reply of [
      { ...okReply('{}'), status: 500 },
      okReply('<html>'),
      okReply('{"results":"x"}'),
      { ...okReply(geocode), truncated: true },
    ]) {
      const { adapter } = build([reply]);
      const failure = await failureOf(
        adapter.execute(context({ allowedHosts: HOSTS }), 'get_weather', { location: 'Cairo' }),
      );
      expect(failure.kind).toBe(AdapterFailureKind.UNAVAILABLE);
    }
  });

  it('cannot be pointed at a host outside the manifest list', async () => {
    const { adapter, transport } = build([okReply(geocode)]);

    const failure = await failureOf(
      adapter.execute(
        context({ allowedHosts: new Set(['elsewhere.example.com']) }),
        'get_weather',
        { location: 'Cairo' },
      ),
    );

    expect(failure.kind).toBe(AdapterFailureKind.UNAVAILABLE);
    expect(transport.sent).toHaveLength(0);
  });

  it('refuses a missing location and an unknown tool', async () => {
    const { adapter } = build([okReply(geocode)]);

    expect(
      (await failureOf(adapter.execute(context(), 'get_weather', { location: '  ' }))).kind,
    ).toBe(AdapterFailureKind.BAD_INPUT);
    expect((await failureOf(adapter.execute(context(), 'other', { location: 'x' }))).kind).toBe(
      AdapterFailureKind.BAD_INPUT,
    );
  });
});

describe('DatetimeMathAdapter', () => {
  const adapter = new DatetimeMathAdapter();

  it('tells the time in a zone, defaulting to UTC', async () => {
    const result = await adapter.execute(context(), 'current_time', { timezone: 'Asia/Tokyo' });

    expect(result.content).toContain('time zone: Asia/Tokyo (UTC+09:00)');
    expect((await adapter.execute(context(), 'current_time', {})).content).toContain(
      'time zone: UTC (UTC+00:00)',
    );
  });

  it('converts between zones', async () => {
    const result = await adapter.execute(context(), 'convert_time', {
      time: '2026-03-29T09:30:00',
      from_timezone: 'Europe/Paris',
      to_timezone: 'America/New_York',
    });

    expect(result.content).toContain('2026-03-29 09:30:00');
    expect(result.content).toContain('2026-03-29 03:30:00');
    expect(result.content).toContain('=>');
  });

  it('calculates and rounds away float noise', async () => {
    expect(
      (await adapter.execute(context(), 'calculate', { expression: '0.1 + 0.2' })).content,
    ).toBe('0.1 + 0.2 = 0.3');
    expect(
      (await adapter.execute(context(), 'calculate', { expression: '(12.5 * 4) / 3' })).content,
    ).toBe('(12.5 * 4) / 3 = 16.6666666667');
  });

  it('turns every failure into a safe AdapterError', async () => {
    for (const [tool, args] of [
      ['current_time', { timezone: 'Mars/Base' }],
      ['convert_time', { time: '2026-01-01T00:00' }],
      ['calculate', {}],
      ['calculate', { expression: '1/0' }],
      ['unknown', {}],
    ] as const) {
      await expect(adapter.execute(context(), tool, args)).rejects.toBeInstanceOf(AdapterError);
    }
  });
});
