import { ConnectorPresetGroup } from '@claw/shared-types';

/** Translates a preset's `ConnectorPresetGroup` into the combobox section heading. */
export function connectorPresetGroupLabelKey(group: ConnectorPresetGroup): string {
  if (group === ConnectorPresetGroup.LOW_COST_FAST_INFERENCE) {
    return 'connectors.groupLowCost';
  }
  if (group === ConnectorPresetGroup.AGGREGATOR) {
    return 'connectors.groupAggregators';
  }
  return 'connectors.groupDirectLabs';
}
