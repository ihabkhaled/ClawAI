import { CONNECTOR_PRESETS, getConnectorPreset } from '@claw/shared-utilities/connector-presets';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import {
  CUSTOM_PROVIDER_OPTION_PREFIX,
  PRESET_GROUP_ORDER,
  PRESET_PROVIDER_KEYS,
  PROVIDER_DISPLAY_NAMES,
} from '@/constants';
import { ConnectorProvider } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { providerDefinitionRepository } from '@/repositories/connectors/provider-definition.repository';
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
  // Admin-defined providers (Connector providers page) join the dropdown.
  const definitionsQuery = useQuery({
    queryKey: ['connector-provider-definitions', ''],
    queryFn: () => providerDefinitionRepository.list(),
  });
  const definitions = useMemo(
    () => (definitionsQuery.data?.data ?? []).filter((item) => !item.isBuiltIn && item.isActive),
    [definitionsQuery.data],
  );

  const groups = useMemo<ConnectorProviderComboboxGroup[]>(() => {
    const connectedProviders = Object.values(ConnectorProvider).filter(
      (provider) =>
        provider !== ConnectorProvider.CUSTOM_OPENAI_COMPATIBLE &&
        !PRESET_PROVIDER_KEYS.has(provider),
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
        value: preset.key as ConnectorProvider,
        label: preset.displayName,
        hasFreeTier: preset.hasFreeTier,
      })),
    }));

    const customGroup: ConnectorProviderComboboxGroup = {
      key: 'custom',
      label: t('providerManagement.title'),
      options: definitions.map((definition) => ({
        value: `${CUSTOM_PROVIDER_OPTION_PREFIX}${definition.id}`,
        label: definition.displayName,
        hasFreeTier: definition.hasFreeTier,
      })),
    };

    return definitions.length > 0
      ? [connectedGroup, ...presetGroups, customGroup]
      : [connectedGroup, ...presetGroups];
  }, [t, definitions]);

  return { open, setOpen, groups, definitions };
}
