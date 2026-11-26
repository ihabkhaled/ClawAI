import { useMemo } from 'react';

import { useAvailableModels } from '@/hooks/chat/use-available-models';
import type { TranslateFunction } from '@/types/i18n.types';
import type { LiveModelChains, UseAdminLiveModelOptionsResult } from '@/types/live-admin.types';
import { liveModelPickerGroups } from '@/utilities/live-model-chain.utility';

/** The chat picker's model catalogue, shaped for the Live chain editors. */
export function useAdminLiveModelOptions(
  chains: LiveModelChains | null,
  t: TranslateFunction,
): UseAdminLiveModelOptionsResult {
  const { groupedModels, isLoading } = useAvailableModels();
  const modelGroups = useMemo(
    () =>
      liveModelPickerGroups(
        groupedModels,
        chains,
        t('live.admin.modelUnsupported'),
        t('live.admin.modelCurrentGroup'),
      ),
    [chains, groupedModels, t],
  );
  return { modelGroups, isModelsLoading: isLoading };
}
