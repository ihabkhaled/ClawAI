import { AdapterFailureKind } from '../../../../common/enums/adapter-failure-kind.enum';
import { InvokeOutcome } from '../../../../common/enums/invoke-outcome.enum';
import { AdapterError } from '../../errors/adapter.error';
import { evaluateExpression } from '../evaluate-expression.utility';
import { extractPageText } from '../extract-page-text.utility';
import { formatWeather } from '../format-weather.utility';
import { toInvocationState } from '../to-invocation-state.utility';
import {
  assertTimeZone,
  clockIn,
  instantFromLocal,
  zoneOffsetMinutes,
} from '../zoned-time.utility';

describe('evaluateExpression', () => {
  it.each([
    ['1 + 2', 3],
    ['2 + 3 * 4', 14],
    ['(2 + 3) * 4', 20],
    ['10 / 4', 2.5],
    ['10 % 4', 2],
    ['2 ^ 10', 1024],
    ['2 ^ 3 ^ 2', 512],
    ['-2 ^ 2', -4],
    ['-(3 + 4)', -7],
    ['+5', 5],
    ['1.5 * 2', 3],
    ['.5 + .5', 1],
    ['5. + 1', 6],
    ['1e3 + 1', 1001],
    ['2e-2 * 100', 2],
    ['  7  *  6  ', 42],
    ['((((1))))', 1],
    ['1 - -1', 2],
    ['(12.5 * 4) / 3', 50 / 3],
  ])('evaluates %s', (expression, expected) => {
    expect(evaluateExpression(expression)).toBeCloseTo(expected, 10);
  });

  it.each([
    ['', 'Expected a number'],
    ['1 +', 'Expected a number'],
    ['(1 + 2', 'A closing parenthesis is missing'],
    ['1 + 2)', 'Unexpected character in the expression'],
    ['1 / 0', 'Division by zero'],
    ['1 % 0', 'Division by zero'],
    ['abc', 'Expected a number'],
    ['1 + x', 'Expected a number'],
    ['2 3', 'Unexpected character in the expression'],
    ['1e999', 'The result is not a finite number'],
    ['9 ^ 9 ^ 9', 'The result is not a finite number'],
    ['1.2.3', 'Unexpected character in the expression'],
    ['.', 'Expected a number'],
  ])('refuses %j with a safe message', (expression, message) => {
    const run = (): number => evaluateExpression(expression);

    expect(run).toThrow(AdapterError);
    expect(run).toThrow(message);
  });

  it.each([
    'process.exit(1)',
    'constructor',
    '__proto__',
    'require("fs")',
    'globalThis',
    '1; 2',
    '`1`',
    '1,2',
    '0x10',
    '1_000',
  ])('does not execute or accept %j', (expression) => {
    expect(() => evaluateExpression(expression)).toThrow(AdapterError);
  });

  it('refuses expressions nested deeper than 64', () => {
    expect(() => evaluateExpression(`${'('.repeat(100)}1${')'.repeat(100)}`)).toThrow(
      'nested too deeply',
    );
    expect(() => evaluateExpression(`${'-'.repeat(200)}1`)).toThrow('nested too deeply');
  });

  it('marks its failures as bad input', () => {
    try {
      evaluateExpression('1 +');
    } catch (error) {
      expect((error as AdapterError).kind).toBe(AdapterFailureKind.BAD_INPUT);
    }
  });
});

describe('zoned time', () => {
  it('reads the wall clock of an instant in a zone', () => {
    const clock = clockIn(new Date('2026-03-29T07:30:00Z'), 'Europe/Paris');

    expect(clock).toMatchObject({
      date: '2026-03-29',
      time: '09:30:00',
      weekday: 'Sunday',
      timeZone: 'Europe/Paris',
      offset: '+02:00',
      utc: '2026-03-29T07:30:00Z',
    });
  });

  it('knows the offset before and after daylight saving starts', () => {
    expect(zoneOffsetMinutes(new Date('2026-03-29T00:30:00Z'), 'Europe/Paris')).toBe(60);
    expect(zoneOffsetMinutes(new Date('2026-03-29T01:30:00Z'), 'Europe/Paris')).toBe(120);
  });

  it('supports half-hour and negative offsets', () => {
    expect(clockIn(new Date('2026-01-01T00:00:00Z'), 'Asia/Kolkata').offset).toBe('+05:30');
    expect(clockIn(new Date('2026-01-01T12:00:00Z'), 'America/New_York').offset).toBe('-05:00');
  });

  it('converts a local time to the right instant', () => {
    expect(instantFromLocal('2026-03-29T09:30:00', 'Europe/Paris').toISOString()).toBe(
      '2026-03-29T07:30:00.000Z',
    );
    expect(instantFromLocal('2026-01-15 09:30', 'Europe/Paris').toISOString()).toBe(
      '2026-01-15T08:30:00.000Z',
    );
    expect(instantFromLocal('2026-06-01T12:00', 'UTC').toISOString()).toBe(
      '2026-06-01T12:00:00.000Z',
    );
  });

  it('takes the offset that applies after the clocks change', () => {
    expect(instantFromLocal('2026-03-29T12:00:00', 'Europe/Paris').toISOString()).toBe(
      '2026-03-29T10:00:00.000Z',
    );
    expect(instantFromLocal('2026-10-25T12:00:00', 'Europe/Paris').toISOString()).toBe(
      '2026-10-25T11:00:00.000Z',
    );
  });

  it.each(['Mars/Olympus', 'not a zone', '', 'Europe/Paris; DROP'])(
    'refuses the zone %j',
    (zone) => {
      expect(() => assertTimeZone(zone)).toThrow(AdapterError);
    },
  );

  it.each([
    '2026-13-01T10:00',
    '2026-02-30T10:00',
    '2026-01-01T25:00',
    '2026-01-01T10:61',
    '2026-01-01T10:00:61',
    'yesterday',
    '2026-01-01',
    '2026-01-01T10:00Z',
    '2026-01-01T10:00+02:00',
  ])('refuses the time %j', (time) => {
    expect(() => instantFromLocal(time, 'UTC')).toThrow(AdapterError);
  });
});

describe('extractPageText', () => {
  it('reads html, plain text and json', () => {
    expect(extractPageText(200, 'text/html; charset=utf-8', '<p>hi</p>')).toBe('hi');
    expect(extractPageText(200, 'text/plain', ' text \n')).toBe('text');
    expect(extractPageText(200, 'application/json', '{"a":1}')).toBe('{"a":1}');
    expect(extractPageText(200, '', 'no type')).toBe('no type');
  });

  it('refuses a non-2xx status and a non-text body', () => {
    expect(() => extractPageText(404, 'text/html', 'x')).toThrow('HTTP 404');
    expect(() => extractPageText(200, 'application/pdf', '%PDF')).toThrow('not text');
    expect(() => extractPageText(200, 'image/png', 'x')).toThrow(AdapterError);
  });
});

describe('formatWeather', () => {
  const forecast = {
    current: {
      temperature_2m: 24.1,
      apparent_temperature: 25,
      relative_humidity_2m: 40,
      precipitation: 0,
      wind_speed_10m: 12,
      weather_code: 1,
    },
    daily: {
      time: ['2026-10-14', '2026-10-15'],
      weather_code: [1, 61],
      temperature_2m_max: [28, 26],
      temperature_2m_min: [18, 17],
      precipitation_sum: [0, 2.5],
    },
  };

  it('writes metric units', () => {
    const text = formatWeather('Cairo, Egypt', forecast, 'metric');

    expect(text).toContain('Weather for Cairo, Egypt');
    expect(text).toContain('mainly clear, 24.1°C');
    expect(text).toContain('wind 12 km/h');
    expect(text).toContain('2026-10-15: slight rain, 17 to 26°C, precipitation 2.5 mm');
  });

  it('writes imperial units and tolerates an unknown code', () => {
    const text = formatWeather(
      'X',
      { ...forecast, current: { ...forecast.current, weather_code: 12345 } },
      'imperial',
    );

    expect(text).toContain('unknown conditions, 24.1°F');
    expect(text).toContain('mph');
    expect(text).toContain(' in');
  });
});

describe('toInvocationState', () => {
  it('maps each outcome to the audit status and never audits a question', () => {
    expect(toInvocationState(InvokeOutcome.OK)).toBe('OK');
    expect(toInvocationState(InvokeOutcome.ERROR)).toBe('ERROR');
    expect(toInvocationState(InvokeOutcome.TIMEOUT)).toBe('TIMEOUT');
    expect(toInvocationState(InvokeOutcome.BLOCKED)).toBe('BLOCKED');
    expect(toInvocationState(InvokeOutcome.RATE_LIMITED)).toBe('RATE_LIMITED');
    expect(toInvocationState(InvokeOutcome.QUOTA_EXCEEDED)).toBe('QUOTA_EXCEEDED');
    expect(toInvocationState(InvokeOutcome.CONSENT_REQUIRED)).toBe('DENIED');
  });
});
