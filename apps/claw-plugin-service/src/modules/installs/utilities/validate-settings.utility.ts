import { SettingsIssue } from '../../../common/enums/settings-issue.enum';
import { isPlainRecord } from '../../../common/utilities/is-plain-record.utility';
import { SCHEMA_FORBIDDEN_KEYS } from '../../catalog/constants/catalog.constants';
import {
  SETTINGS_MAX_ARRAY_ITEMS,
  SETTINGS_MAX_BYTES,
  SETTINGS_MAX_DEPTH,
  SETTINGS_MAX_STRING_LENGTH,
} from '../constants/installs.constants';
import type {
  PropertyRules,
  SettingsRecord,
  SettingsViolation,
} from '../types/settings-validation.types';

function matchesType(type: unknown, value: unknown): boolean {
  switch (type) {
    case 'object':
      return isPlainRecord(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    default:
      return true;
  }
}

function checkAllowed(
  schema: SettingsRecord,
  value: unknown,
  path: string,
  out: SettingsViolation[],
): void {
  const allowed = schema['enum'];
  if (Array.isArray(allowed) && !allowed.includes(value)) {
    out.push({ path, issue: SettingsIssue.NOT_ALLOWED });
  }
  if ('const' in schema && schema['const'] !== value) {
    out.push({ path, issue: SettingsIssue.NOT_ALLOWED });
  }
}

function checkString(
  schema: SettingsRecord,
  value: string,
  path: string,
  out: SettingsViolation[],
): void {
  const declaredMax = typeof schema['maxLength'] === 'number' ? schema['maxLength'] : undefined;
  const minLength = typeof schema['minLength'] === 'number' ? schema['minLength'] : 0;
  const maxLength = Math.min(declaredMax ?? SETTINGS_MAX_STRING_LENGTH, SETTINGS_MAX_STRING_LENGTH);
  if (value.length > maxLength) out.push({ path, issue: SettingsIssue.TOO_LONG });
  if (value.length < minLength) out.push({ path, issue: SettingsIssue.TOO_SHORT });
}

function checkNumber(
  schema: SettingsRecord,
  value: number,
  path: string,
  out: SettingsViolation[],
): void {
  const { minimum, maximum } = schema;
  const below = typeof minimum === 'number' && value < minimum;
  const above = typeof maximum === 'number' && value > maximum;
  if (below || above) out.push({ path, issue: SettingsIssue.OUT_OF_RANGE });
}

function checkArray(
  schema: SettingsRecord,
  value: unknown[],
  path: string,
  depth: number,
  out: SettingsViolation[],
): void {
  const declared =
    typeof schema['maxItems'] === 'number' ? schema['maxItems'] : SETTINGS_MAX_ARRAY_ITEMS;
  if (value.length > Math.min(declared, SETTINGS_MAX_ARRAY_ITEMS)) {
    out.push({ path, issue: SettingsIssue.TOO_MANY_ITEMS });
    return;
  }
  const items = schema['items'];
  if (!isPlainRecord(items)) return;
  for (const [index, item] of value.entries()) {
    checkValue(items, item, `${path}[${String(index)}]`, depth + 1, out);
  }
}

function checkProperty(
  rules: PropertyRules,
  child: string,
  value: unknown,
  depth: number,
  out: SettingsViolation[],
): void {
  if (SCHEMA_FORBIDDEN_KEYS.includes(rules.key)) {
    out.push({ path: child, issue: SettingsIssue.UNKNOWN_KEY });
  } else if (isPlainRecord(rules.declared)) {
    checkValue(rules.declared, value, child, depth + 1, out);
  } else if (isPlainRecord(rules.additional)) {
    checkValue(rules.additional, value, child, depth + 1, out);
  } else if (rules.additional !== true) {
    out.push({ path: child, issue: SettingsIssue.UNKNOWN_KEY });
  }
}

function checkObject(
  schema: SettingsRecord,
  value: SettingsRecord,
  path: string,
  depth: number,
  out: SettingsViolation[],
): void {
  const declared = new Map(
    Object.entries(isPlainRecord(schema['properties']) ? schema['properties'] : {}),
  );
  for (const [key, child] of Object.entries(value)) {
    const rules: PropertyRules = {
      key,
      declared: declared.get(key),
      additional: schema['additionalProperties'],
    };
    checkProperty(rules, path === '' ? key : `${path}.${key}`, child, depth, out);
  }
  const required = Array.isArray(schema['required']) ? schema['required'] : [];
  for (const key of required) {
    if (typeof key === 'string' && !Object.hasOwn(value, key)) {
      out.push({
        path: path === '' ? key : `${path}.${key}`,
        issue: SettingsIssue.MISSING_REQUIRED,
      });
    }
  }
}

function checkValue(
  schema: SettingsRecord,
  value: unknown,
  path: string,
  depth: number,
  out: SettingsViolation[],
): void {
  if (depth > SETTINGS_MAX_DEPTH) {
    out.push({ path, issue: SettingsIssue.TOO_DEEP });
    return;
  }
  if (!matchesType(schema['type'], value)) {
    out.push({ path, issue: SettingsIssue.WRONG_TYPE });
    return;
  }
  checkAllowed(schema, value, path, out);
  if (isPlainRecord(value)) checkObject(schema, value, path, depth, out);
  else if (Array.isArray(value)) checkArray(schema, value, path, depth, out);
  else if (typeof value === 'string') checkString(schema, value, path, out);
  else if (typeof value === 'number') checkNumber(schema, value, path, out);
}

function serialisedBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

/**
 * Checks install settings against a manifest `settingsSchema`. The schema is already vetted at
 * publish time to a small JSON-Schema subset; this walks only type, enum, const, required,
 * properties, additionalProperties (unknown keys are refused unless explicitly allowed),
 * min/max, length and array limits. Violations name a path and a reason, never the value.
 */
export function validateSettings(schema: SettingsRecord, value: unknown): SettingsViolation[] {
  if (serialisedBytes(value) > SETTINGS_MAX_BYTES) {
    return [{ path: '', issue: SettingsIssue.TOO_LARGE }];
  }
  const violations: SettingsViolation[] = [];
  checkValue({ ...schema, type: 'object' }, value, '', 0, violations);
  return violations;
}

/** Fills top-level properties that declare a `default` and are missing from the value. */
export function applySettingsDefaults(
  schema: SettingsRecord,
  value: SettingsRecord,
): SettingsRecord {
  const properties = isPlainRecord(schema['properties']) ? schema['properties'] : {};
  const result = new Map(Object.entries(value));
  for (const [key, definition] of Object.entries(properties)) {
    if (isPlainRecord(definition) && 'default' in definition && !result.has(key)) {
      result.set(key, structuredClone(definition['default']));
    }
  }
  return Object.fromEntries(result);
}
