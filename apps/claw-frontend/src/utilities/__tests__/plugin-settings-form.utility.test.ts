import { describe, expect, it } from 'vitest';

import { PluginSettingsFieldKind } from '@/enums/plugin-settings-field-kind.enum';
import type { PluginSettingsField } from '@/types/plugin-installs.types';

import {
  buildSettingsFields,
  initialSettingsDraft,
  numberInputMode,
  textMaxLength,
  validateSettingsDraft,
} from '../plugin-settings-form.utility';

const SCHEMA = {
  type: 'object',
  required: ['units'],
  properties: {
    units: { type: 'string', title: 'Units', enum: ['metric', 'imperial'], default: 'metric' },
    city: { type: 'string', description: 'Home city' },
    days: { type: 'integer', minimum: 1, maximum: 7, default: 3 },
    ratio: { type: 'number' },
    compact: { type: 'boolean', default: true },
    nested: { type: 'object' },
    broken: 'not a schema',
  },
};

describe('buildSettingsFields', () => {
  it('draws string, enum, integer, number and boolean fields and skips the rest', () => {
    const fields = buildSettingsFields(SCHEMA);
    expect(fields.map((field) => [field.key, field.kind])).toEqual([
      ['units', PluginSettingsFieldKind.Select],
      ['city', PluginSettingsFieldKind.Text],
      ['days', PluginSettingsFieldKind.Number],
      ['ratio', PluginSettingsFieldKind.Number],
      ['compact', PluginSettingsFieldKind.Boolean],
    ]);
  });

  it('carries the label, description, bounds, required flag and default', () => {
    const [units, city, days] = buildSettingsFields(SCHEMA);
    expect(units).toMatchObject({
      label: 'Units',
      required: true,
      options: ['metric', 'imperial'],
      fallback: 'metric',
    });
    expect(city).toMatchObject({ label: 'city', description: 'Home city', required: false });
    expect(days).toMatchObject({ min: 1, max: 7, integer: true, fallback: '3' });
  });

  it('returns no fields for a schema without properties or a non-object', () => {
    expect(buildSettingsFields(undefined)).toEqual([]);
    expect(buildSettingsFields('x')).toEqual([]);
    expect(buildSettingsFields([])).toEqual([]);
    expect(buildSettingsFields({ type: 'object' })).toEqual([]);
    expect(buildSettingsFields({ properties: [] })).toEqual([]);
  });

  it('ignores a non-string required list and non-string enum entries', () => {
    const fields = buildSettingsFields({
      required: 'units',
      properties: { units: { type: 'string', enum: ['a', 1] } },
    });
    expect(fields[0]).toMatchObject({ required: false, options: ['a'] });
  });
});

describe('initialSettingsDraft', () => {
  const fields = buildSettingsFields(SCHEMA);

  it('uses the schema default when nothing is saved', () => {
    expect(initialSettingsDraft(fields, {})).toEqual({
      units: 'metric',
      city: '',
      days: '3',
      ratio: '',
      compact: true,
    });
  });

  it('prefers the saved value, as text for numbers', () => {
    expect(
      initialSettingsDraft(fields, { units: 'imperial', city: 'Cairo', days: 5, compact: false }),
    ).toEqual({ units: 'imperial', city: 'Cairo', days: '5', ratio: '', compact: false });
  });

  it('ignores a saved value of the wrong type', () => {
    expect(initialSettingsDraft(fields, { compact: 'yes', city: { a: 1 } })).toMatchObject({
      compact: true,
      city: '',
    });
  });
});

describe('validateSettingsDraft', () => {
  const fields = buildSettingsFields(SCHEMA);

  it('parses a valid draft and leaves out empty optional fields', () => {
    const result = validateSettingsDraft(fields, {
      units: 'imperial',
      city: '',
      days: '4',
      ratio: '0.5',
      compact: false,
    });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ units: 'imperial', days: 4, ratio: 0.5, compact: false });
  });

  it('requires a required field', () => {
    const result = validateSettingsDraft(fields, { units: '  ' });
    expect(result.errors.units).toBe('pluginsInstall.validation.required');
  });

  it('rejects an option that is not in the list', () => {
    expect(validateSettingsDraft(fields, { units: 'kelvin' }).errors.units).toBe(
      'pluginsInstall.validation.option',
    );
  });

  it('checks numbers: not a number, not whole, out of range', () => {
    const base = { units: 'metric' };
    expect(validateSettingsDraft(fields, { ...base, days: 'abc' }).errors.days).toBe(
      'pluginsInstall.validation.number',
    );
    expect(validateSettingsDraft(fields, { ...base, days: '2.5' }).errors.days).toBe(
      'pluginsInstall.validation.integer',
    );
    expect(validateSettingsDraft(fields, { ...base, days: '0' }).errors.days).toBe(
      'pluginsInstall.validation.range',
    );
    expect(validateSettingsDraft(fields, { ...base, days: '8' }).errors.days).toBe(
      'pluginsInstall.validation.range',
    );
    expect(validateSettingsDraft(fields, { ...base, ratio: '1.5' }).errors.ratio).toBeUndefined();
  });

  it('caps free text length', () => {
    const result = validateSettingsDraft(fields, { units: 'metric', city: 'x'.repeat(501) });
    expect(result.errors.city).toBe('pluginsInstall.validation.tooLong');
  });

  it('honours the schema minLength and maxLength', () => {
    const bounded = buildSettingsFields({
      type: 'object',
      properties: { code: { type: 'string', minLength: 3, maxLength: 5 } },
    });
    expect(bounded[0]).toMatchObject({ minLength: 3, maxLength: 5 });
    expect(textMaxLength(bounded[0] as PluginSettingsField)).toBe(5);
    expect(validateSettingsDraft(bounded, { code: 'ab' }).errors.code).toBe(
      'pluginsStatus.validation.tooShort',
    );
    expect(validateSettingsDraft(bounded, { code: 'abcdef' }).errors.code).toBe(
      'pluginsInstall.validation.tooLong',
    );
    expect(validateSettingsDraft(bounded, { code: 'abcd' }).values.code).toBe('abcd');
  });

  it('never lets a schema maxLength exceed the form cap', () => {
    const [wide] = buildSettingsFields({
      type: 'object',
      properties: { note: { type: 'string', maxLength: 99999 } },
    });
    expect(textMaxLength(wide as PluginSettingsField)).toBe(500);
  });

  it('asks for the digits keyboard on a whole-number field only', () => {
    const fields = buildSettingsFields(SCHEMA);
    const days = fields.find((field) => field.key === 'days');
    const ratio = fields.find((field) => field.key === 'ratio');
    const city = fields.find((field) => field.key === 'city');
    expect(numberInputMode(days as PluginSettingsField)).toBe('numeric');
    expect(numberInputMode(ratio as PluginSettingsField)).toBe('decimal');
    expect(numberInputMode(city as PluginSettingsField)).toBeUndefined();
  });

  it('treats a missing boolean as false', () => {
    expect(validateSettingsDraft(fields, { units: 'metric' }).values.compact).toBe(false);
  });
});
