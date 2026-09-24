import { ConnectorPresetGroup } from '@claw/shared-types';
import { CONNECTOR_PRESETS } from '@claw/shared-utilities';

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
