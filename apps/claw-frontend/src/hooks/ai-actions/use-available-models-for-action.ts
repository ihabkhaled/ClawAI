import { useMemo } from 'react';

import {
  AI_ACTION_IMAGE_PROVIDERS,
  AUTO_GROUP_PROVIDER,
  AUTO_MODEL,
} from '@/constants/ai-actions.constants';
import type { AiActionKind } from '@/enums/ai-action-kind.enum';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import type { UseAvailableModelsForActionResult } from '@/types/ai-action.types';
import type { GroupedModels } from '@/types/component.types';

export function useAvailableModelsForAction(
  _actionKind: AiActionKind,
): UseAvailableModelsForActionResult {
  const { groupedModels, isLoading } = useAvailableModels();

  const filtered = useMemo((): GroupedModels[] => {
    const autoGroup: GroupedModels = {
      provider: AUTO_GROUP_PROVIDER,
      label: 'AUTO',
      models: [AUTO_MODEL],
    };
    const textGroups = groupedModels.filter(
      (group) => !AI_ACTION_IMAGE_PROVIDERS.has(group.provider),
    );
    return [autoGroup, ...textGroups];
  }, [groupedModels]);

  return { groupedModels: filtered, isLoading };
}
