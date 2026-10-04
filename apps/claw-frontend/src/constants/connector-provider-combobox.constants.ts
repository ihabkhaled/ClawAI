import { ConnectorPresetGroup } from '@claw/shared-types';
import { CONNECTOR_PRESETS } from '@claw/shared-utilities/connector-presets';

/** Every provider key served through the OpenAI-compatible preset registry. */
export const PRESET_PROVIDER_KEYS = new Set<string>(CONNECTOR_PRESETS.map((preset) => preset.key));

/**
 * Registry order for the 3 preset sections of the connector-provider
 * combobox. `ConnectorPreset.group` (ADR-117) already sorts every
 * OpenAI-compatible provider into these three buckets.
 */
export const PRESET_GROUP_ORDER: readonly ConnectorPresetGroup[] = [
  ConnectorPresetGroup.LOW_COST_FAST_INFERENCE,
  ConnectorPresetGroup.AGGREGATOR,
  ConnectorPresetGroup.DIRECT_MODEL_LAB,
];

/** Combobox option values for admin-defined providers: `custom:<definitionId>`. */
export const CUSTOM_PROVIDER_OPTION_PREFIX = 'custom:';

export const PROVIDER_AUTH_TYPE_OPTIONS = [
  { value: 'API_KEY', label: 'API key' },
  { value: 'NONE', label: 'None' },
  { value: 'OAUTH2', label: 'OAuth2' },
] as const;

/** Shapes of a provider model-list response. */
export const PROVIDER_MODELS_FORMAT_OPTIONS = [
  { value: 'OPENAI_LIST', label: '{ data: [{ id }] }' },
  { value: 'BARE_ARRAY', label: '[{ id | name }]' },
  { value: 'COHERE_MODELS', label: '{ models: [{ name }] }' },
  { value: 'CLOUDFLARE_SEARCH', label: '{ result: [{ name }] }' },
] as const;

/** Tailwind classes for the native selects in the provider form. */
export const PROVIDER_SELECT_CLASS = 'border-input bg-background h-10 rounded-md border px-3';
