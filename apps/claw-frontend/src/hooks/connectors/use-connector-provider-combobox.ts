import { CONNECTOR_PRESETS, getConnectorPreset } from '@claw/shared-utilities';
import { useMemo, useState } from 'react';

import { PRESET_GROUP_ORDER, PRESET_PROVIDER_KEYS, PROVIDER_DISPLAY_NAMES } from '@/constants';
import { ConnectorProvider } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import type { ConnectorProviderComboboxGroup, ConnectorProviderComboboxState } from '@/types';
import { connectorPresetGroupLabelKey } from '@/utilities';

/**
 * Groups and open state for the connector-provider combobox.
 *
 * Group 1 is every provider connector-service already serves through a
 * bespoke adapter (OpenAI, Anthropic, Gemini, AWS Bedrock, DeepSeek, Ollama,
 * Grok, llama.cpp) — "Connected providers" per the dropdown UX spec. Groups
 * 2-4 are the 15 OpenAI-compatible presets, split by `ConnectorPreset.group`
 * exactly as batch 1's registry already classifies them.
 */
export function useConnectorProviderCombobox(): ConnectorProviderComboboxState {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const groups = useMemo<ConnectorProviderComboboxGroup[]>(() => {
    const connectedProviders = Object.values(ConnectorProvider).filter(
      (provider) => !PRESET_PROVIDER_KEYS.has(provider),
    );

    const connectedGroup: ConnectorProviderComboboxGroup = {
      key: 'connected',
      label: t('connectors.groupConnected'),
      options: connectedProviders.map((provider) => ({
        value: provider,
        label: PROVIDER_DISPLAY_NAMES[provider],
        hasFreeTier: getConnectorPreset(provider)?.hasFreeTier ?? false,
      })),
    };

    const presetGroups = PRESET_GROUP_ORDER.map((group) => ({
      key: group,
      label: t(connectorPresetGroupLabelKey(group)),
      options: CONNECTOR_PRESETS.filter((preset) => preset.group === group).map((preset) => ({
        value: preset.key,
        label: preset.displayName,
        hasFreeTier: preset.hasFreeTier,
      })),
    }));

    return [connectedGroup, ...presetGroups];
  }, [t]);

  return { open, setOpen, groups };
}
