import {
  type ConnectorPreset,
  ConnectorPresetExtraField,
  type ConnectorPresetGroup,
} from '@claw/shared-types';
import {
  CONNECTOR_PRESET_ACCOUNT_ID_PATTERN,
  CONNECTOR_PRESET_ACCOUNT_ID_PLACEHOLDER,
  CONNECTOR_PRESETS,
} from './connector-presets.constants';

/** The preset for a provider key, or undefined for a bespoke provider. */
export function getConnectorPreset(provider: string): ConnectorPreset | undefined {
  const key = provider.trim().toUpperCase();
  return CONNECTOR_PRESETS.find((preset) => preset.key === key);
}

/** True when the provider is served by the generic OpenAI-compatible adapter. */
export function isConnectorPresetProvider(provider: string): boolean {
  return getConnectorPreset(provider) !== undefined;
}

/** Every preset in one picker group, in registry order. */
export function listConnectorPresetsByGroup(group: ConnectorPresetGroup): ConnectorPreset[] {
  return CONNECTOR_PRESETS.filter((preset) => preset.group === group);
}

/** `{ PROVIDER: displayName }` for every preset — for labels keyed by provider. */
export function connectorPresetDisplayNames(): Record<string, string> {
  return Object.fromEntries(CONNECTOR_PRESETS.map((preset) => [preset.key, preset.displayName]));
}

/** True when the provider's preset cannot build a URL without an account id. */
export function presetRequiresAccountId(provider: string): boolean {
  return (
    getConnectorPreset(provider)?.extraFields.includes(ConnectorPresetExtraField.ACCOUNT_ID) ??
    false
  );
}

/** Canonical form of an account id: trimmed and lower-cased. */
export function normalizePresetAccountId(value: string): string {
  return value.trim().toLowerCase();
}

/** True for a 32-character hex account id (after normalisation). */
export function isValidPresetAccountId(value: string): boolean {
  return CONNECTOR_PRESET_ACCOUNT_ID_PATTERN.test(normalizePresetAccountId(value));
}

/** True when a URL still carries the `{ACCOUNT_ID}` placeholder. */
export function hasAccountIdPlaceholder(url: string): boolean {
  return url.includes(CONNECTOR_PRESET_ACCOUNT_ID_PLACEHOLDER);
}

/**
 * Fills `{ACCOUNT_ID}` in a preset URL.
 *
 * Throws rather than returning the template: a URL with a literal placeholder
 * in its path would be sent to the provider and fail with a confusing 404, and
 * anything but a 32-char hex id would be spliced into the request path.
 */
export function resolvePresetUrl(template: string, accountId: string | undefined): string {
  if (!hasAccountIdPlaceholder(template)) {
    return template;
  }
  if (accountId === undefined || !isValidPresetAccountId(accountId)) {
    throw new Error('This provider needs a 32-character hexadecimal account ID');
  }
  return template.replaceAll(
    CONNECTOR_PRESET_ACCOUNT_ID_PLACEHOLDER,
    normalizePresetAccountId(accountId),
  );
}

/** The connector's own base URL when set, otherwise the preset default — resolved. */
export function resolvePresetBaseUrl(
  preset: ConnectorPreset,
  baseUrlOverride: string | undefined,
  accountId: string | undefined,
): string {
  const override = baseUrlOverride?.trim() ?? '';
  const template = override.length > 0 ? override : preset.defaultBaseUrl;
  return trimTrailingSlashes(resolvePresetUrl(template, accountId));
}

/**
 * Resolves an endpoint that is either an absolute URL or a path joined to the
 * connector's effective base URL. A relative endpoint follows an edited base
 * URL (a China-region host, a proxy); an absolute one does not.
 */
export function resolvePresetEndpoint(
  endpoint: string,
  effectiveBaseUrl: string,
  accountId: string | undefined,
): string {
  if (/^https?:\/\//iu.test(endpoint)) {
    return resolvePresetUrl(endpoint, accountId);
  }
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${trimTrailingSlashes(effectiveBaseUrl)}${path}`;
}

function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/u, '');
}
