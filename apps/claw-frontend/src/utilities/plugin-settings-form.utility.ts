import {
  PLUGIN_SETTINGS_TEXT_MAX_LENGTH,
  PLUGIN_VALIDATION_KEYS,
} from '@/constants/plugin-installs.constants';
import { PluginSettingsFieldKind } from '@/enums/plugin-settings-field-kind.enum';
import type {
  PluginSettingsDraft,
  PluginSettingsField,
  PluginSettingsValidation,
} from '@/types/plugin-installs.types';

type SchemaRecord = Record<string, unknown>;

function isRecord(value: unknown): value is SchemaRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberOf(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionsOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function kindOf(property: SchemaRecord, options: string[]): PluginSettingsFieldKind | null {
  if (options.length > 0) {
    return PluginSettingsFieldKind.Select;
  }
  switch (property.type) {
    case 'string':
      return PluginSettingsFieldKind.Text;
    case 'number':
    case 'integer':
      return PluginSettingsFieldKind.Number;
    case 'boolean':
      return PluginSettingsFieldKind.Boolean;
    default:
      return null;
  }
}

function fallbackOf(kind: PluginSettingsFieldKind, property: SchemaRecord): string | boolean {
  const { default: value } = property;
  if (kind === PluginSettingsFieldKind.Boolean) {
    return value === true;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return textOf(value);
}

function toField(key: string, property: unknown, required: string[]): PluginSettingsField | null {
  if (!isRecord(property)) {
    return null;
  }
  const options = optionsOf(property.enum);
  const kind = kindOf(property, options);
  if (kind === null) {
    return null;
  }
  return {
    key,
    kind,
    label: textOf(property.title) || key,
    description: textOf(property.description),
    required: required.includes(key),
    options,
    min: numberOf(property.minimum),
    max: numberOf(property.maximum),
    minLength: numberOf(property.minLength),
    maxLength: numberOf(property.maxLength),
    integer: property.type === 'integer',
    fallback: fallbackOf(kind, property),
  };
}

/**
 * The fields of the settings form, from the manifest's `settingsSchema` subset:
 * string, number, integer, boolean and string enums. Anything else is skipped, so a
 * schema this form cannot draw never breaks the sheet.
 */
export function buildSettingsFields(schema: unknown): PluginSettingsField[] {
  if (!isRecord(schema) || !isRecord(schema.properties)) {
    return [];
  }
  const required = optionsOf(schema.required);
  return Object.entries(schema.properties)
    .map(([key, property]) => toField(key, property, required))
    .filter((field): field is PluginSettingsField => field !== null);
}

function draftValue(field: PluginSettingsField, current: unknown): string | boolean {
  if (field.kind === PluginSettingsFieldKind.Boolean) {
    return typeof current === 'boolean' ? current : field.fallback === true;
  }
  if (typeof current === 'string' || typeof current === 'number') {
    return String(current);
  }
  return typeof field.fallback === 'string' ? field.fallback : '';
}

/** The draft the form starts from: the saved value when there is one, else the schema default. */
export function initialSettingsDraft(
  fields: PluginSettingsField[],
  current: Record<string, unknown>,
): PluginSettingsDraft {
  return Object.fromEntries(
    fields.map((field) => [field.key, draftValue(field, current[field.key])]),
  );
}

function checkNumber(field: PluginSettingsField, text: string): { value?: number; error?: string } {
  const value = Number(text);
  if (!Number.isFinite(value)) {
    return { error: PLUGIN_VALIDATION_KEYS.number };
  }
  if (field.integer && !Number.isInteger(value)) {
    return { error: PLUGIN_VALIDATION_KEYS.integer };
  }
  const belowMin = field.min !== undefined && value < field.min;
  const aboveMax = field.max !== undefined && value > field.max;
  return belowMin || aboveMax ? { error: PLUGIN_VALIDATION_KEYS.range } : { value };
}

/** The longest text a field takes: the schema maxLength, never more than the form's own cap. */
export function textMaxLength(field: PluginSettingsField): number {
  return Math.min(
    field.maxLength ?? PLUGIN_SETTINGS_TEXT_MAX_LENGTH,
    PLUGIN_SETTINGS_TEXT_MAX_LENGTH,
  );
}

/** A whole-number field gets the digits keyboard; a decimal one keeps the decimal point. */
export function numberInputMode(field: PluginSettingsField): 'numeric' | 'decimal' | undefined {
  if (field.kind !== PluginSettingsFieldKind.Number) {
    return undefined;
  }
  return field.integer ? 'numeric' : 'decimal';
}

function checkText(field: PluginSettingsField, text: string): { value?: unknown; error?: string } {
  if (field.kind === PluginSettingsFieldKind.Select) {
    return field.options.includes(text)
      ? { value: text }
      : { error: PLUGIN_VALIDATION_KEYS.option };
  }
  if (field.kind === PluginSettingsFieldKind.Number) {
    return checkNumber(field, text);
  }
  if (text.length > textMaxLength(field)) {
    return { error: PLUGIN_VALIDATION_KEYS.tooLong };
  }
  if (field.minLength !== undefined && text.length < field.minLength) {
    return { error: PLUGIN_VALIDATION_KEYS.tooShort };
  }
  return { value: text };
}

function checkField(
  field: PluginSettingsField,
  raw: string | boolean | undefined,
): { value?: unknown; error?: string } {
  if (field.kind === PluginSettingsFieldKind.Boolean) {
    return { value: raw === true };
  }
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (text.length === 0) {
    return field.required ? { error: PLUGIN_VALIDATION_KEYS.required } : {};
  }
  return checkText(field, text);
}

/** Parses the draft into typed values; an empty optional field is left out of the saved settings. */
export function validateSettingsDraft(
  fields: PluginSettingsField[],
  draft: PluginSettingsDraft,
): PluginSettingsValidation {
  const result: PluginSettingsValidation = { values: {}, errors: {} };
  for (const field of fields) {
    const checked = checkField(field, draft[field.key]);
    if (checked.error !== undefined) {
      result.errors[field.key] = checked.error;
    } else if (checked.value !== undefined) {
      result.values[field.key] = checked.value;
    }
  }
  return result;
}
