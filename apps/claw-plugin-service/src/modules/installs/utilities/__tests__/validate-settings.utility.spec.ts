import { SettingsIssue } from '../../../../common/enums/settings-issue.enum';
import { applySettingsDefaults, validateSettings } from '../validate-settings.utility';

const WEATHER_SCHEMA = {
  type: 'object',
  properties: { units: { type: 'string', enum: ['metric', 'imperial'], default: 'metric' } },
  additionalProperties: false,
};

function nestedObject(levels: number): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let cursor = root;
  for (let level = 0; level < levels; level += 1) {
    const next: Record<string, unknown> = {};
    cursor['a'] = next;
    cursor = next;
  }
  return root;
}

function nestedSchema(levels: number): Record<string, unknown> {
  const root: Record<string, unknown> = { type: 'object' };
  let cursor = root;
  for (let level = 0; level < levels; level += 1) {
    const child: Record<string, unknown> = { type: 'object' };
    cursor['additionalProperties'] = child;
    cursor = child;
  }
  return root;
}

describe('validateSettings', () => {
  it('accepts a conforming value and an empty value for an empty schema', () => {
    expect(validateSettings(WEATHER_SCHEMA, { units: 'imperial' })).toEqual([]);
    expect(validateSettings({ type: 'object', properties: {} }, {})).toEqual([]);
  });

  it.each([['text'], [5], [null], [[1]]])('refuses a value that is not an object (%#)', (bad) => {
    expect(validateSettings(WEATHER_SCHEMA, bad)).toEqual([
      { path: '', issue: SettingsIssue.WRONG_TYPE },
    ]);
  });

  it('refuses unknown keys unless additionalProperties is allowed', () => {
    expect(validateSettings(WEATHER_SCHEMA, { other: 1 })).toEqual([
      { path: 'other', issue: SettingsIssue.UNKNOWN_KEY },
    ]);
    expect(validateSettings({ type: 'object', additionalProperties: true }, { other: 1 })).toEqual(
      [],
    );
    expect(
      validateSettings(
        { type: 'object', additionalProperties: { type: 'number' } },
        { a: 1, b: 'x' },
      ),
    ).toEqual([{ path: 'b', issue: SettingsIssue.WRONG_TYPE }]);
  });

  it('refuses prototype-pollution keys even when additionalProperties is true', () => {
    const hostile = JSON.parse('{"__proto__": {"x": 1}}') as unknown;
    expect(validateSettings({ type: 'object', additionalProperties: true }, hostile)).toEqual([
      { path: '__proto__', issue: SettingsIssue.UNKNOWN_KEY },
    ]);
  });

  it('checks enum, const and types', () => {
    expect(validateSettings(WEATHER_SCHEMA, { units: 'kelvin' })).toEqual([
      { path: 'units', issue: SettingsIssue.NOT_ALLOWED },
    ]);
    expect(validateSettings(WEATHER_SCHEMA, { units: 3 })).toEqual([
      { path: 'units', issue: SettingsIssue.WRONG_TYPE },
    ]);
    const constSchema = { type: 'object', properties: { mode: { const: 'a' } } };
    expect(validateSettings(constSchema, { mode: 'b' })).toEqual([
      { path: 'mode', issue: SettingsIssue.NOT_ALLOWED },
    ]);
    expect(validateSettings(constSchema, { mode: 'a' })).toEqual([]);
  });

  it('reports required keys that are missing', () => {
    const schema = {
      type: 'object',
      properties: { key: { type: 'string' } },
      required: ['key', 7],
    };
    expect(validateSettings(schema, {})).toEqual([
      { path: 'key', issue: SettingsIssue.MISSING_REQUIRED },
    ]);
    expect(validateSettings(schema, { key: 'x' })).toEqual([]);
  });

  it('reports a missing required key inside a nested object with its full path', () => {
    const schema = {
      type: 'object',
      properties: {
        auth: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] },
      },
    };
    expect(validateSettings(schema, { auth: {} })).toEqual([
      { path: 'auth.token', issue: SettingsIssue.MISSING_REQUIRED },
    ]);
  });

  it('treats a value with no JSON form as an empty payload and refuses it as not an object', () => {
    expect(validateSettings(WEATHER_SCHEMA, undefined)).toEqual([
      { path: '', issue: SettingsIssue.WRONG_TYPE },
    ]);
  });

  it('checks string length with the schema bound and the hard cap', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 4 },
        free: { type: 'string' },
      },
    };
    expect(validateSettings(schema, { name: 'a' })).toEqual([
      { path: 'name', issue: SettingsIssue.TOO_SHORT },
    ]);
    expect(validateSettings(schema, { name: 'abcde' })).toEqual([
      { path: 'name', issue: SettingsIssue.TOO_LONG },
    ]);
    expect(validateSettings(schema, { free: 'x'.repeat(2001) })).toEqual([
      { path: 'free', issue: SettingsIssue.TOO_LONG },
    ]);
  });

  it('checks numbers, integers and ranges', () => {
    const schema = {
      type: 'object',
      properties: { count: { type: 'integer', minimum: 1, maximum: 5 }, ratio: { type: 'number' } },
    };
    expect(validateSettings(schema, { count: 3, ratio: 0.5 })).toEqual([]);
    expect(validateSettings(schema, { count: 0 })).toEqual([
      { path: 'count', issue: SettingsIssue.OUT_OF_RANGE },
    ]);
    expect(validateSettings(schema, { count: 6 })).toEqual([
      { path: 'count', issue: SettingsIssue.OUT_OF_RANGE },
    ]);
    expect(validateSettings(schema, { count: 1.5 })).toEqual([
      { path: 'count', issue: SettingsIssue.WRONG_TYPE },
    ]);
    expect(validateSettings(schema, { ratio: Number.NaN })).toEqual([
      { path: 'ratio', issue: SettingsIssue.WRONG_TYPE },
    ]);
  });

  it('checks booleans and untyped properties', () => {
    const schema = { type: 'object', properties: { on: { type: 'boolean' }, any: {} } };
    expect(validateSettings(schema, { on: true, any: [1] })).toEqual([]);
    expect(validateSettings(schema, { on: 'yes' })).toEqual([
      { path: 'on', issue: SettingsIssue.WRONG_TYPE },
    ]);
  });

  it('checks array items and limits', () => {
    const schema = {
      type: 'object',
      properties: {
        tags: { type: 'array', maxItems: 2, items: { type: 'string' } },
        raw: { type: 'array' },
      },
    };
    expect(validateSettings(schema, { tags: ['a', 'b'] })).toEqual([]);
    expect(validateSettings(schema, { tags: ['a', 'b', 'c'] })).toEqual([
      { path: 'tags', issue: SettingsIssue.TOO_MANY_ITEMS },
    ]);
    expect(validateSettings(schema, { tags: ['a', 3] })).toEqual([
      { path: 'tags[1]', issue: SettingsIssue.WRONG_TYPE },
    ]);
    expect(validateSettings(schema, { raw: Array.from({ length: 101 }, () => 1) })).toEqual([
      { path: 'raw', issue: SettingsIssue.TOO_MANY_ITEMS },
    ]);
  });

  it('refuses over-deep nesting', () => {
    expect(validateSettings(nestedSchema(2), nestedObject(2))).toEqual([]);
    expect(validateSettings(nestedSchema(6), nestedObject(6))).toContainEqual(
      expect.objectContaining({ issue: SettingsIssue.TOO_DEEP }),
    );
  });

  it('refuses oversized and unserialisable values', () => {
    const open = { type: 'object', additionalProperties: true };
    expect(validateSettings(open, { big: 'x'.repeat(9000) })).toEqual([
      { path: '', issue: SettingsIssue.TOO_LARGE },
    ]);
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(validateSettings(open, circular)).toEqual([
      { path: '', issue: SettingsIssue.TOO_LARGE },
    ]);
  });

  it('never puts the offending value in a violation', () => {
    const violations = validateSettings(WEATHER_SCHEMA, { units: 'SECRET-VALUE' });
    expect(JSON.stringify(violations)).not.toContain('SECRET-VALUE');
  });
});

describe('applySettingsDefaults', () => {
  it('fills missing defaults and keeps given values', () => {
    expect(applySettingsDefaults(WEATHER_SCHEMA, {})).toEqual({ units: 'metric' });
    expect(applySettingsDefaults(WEATHER_SCHEMA, { units: 'imperial' })).toEqual({
      units: 'imperial',
    });
  });

  it('ignores properties without a default and schemas without properties', () => {
    expect(applySettingsDefaults({ properties: { a: { type: 'string' } } }, {})).toEqual({});
    expect(applySettingsDefaults({}, { a: 1 })).toEqual({ a: 1 });
  });
});
