import { useMemo } from 'react';

import { useAvailableModels } from '@/hooks/chat/use-available-models';
import { useTranslation } from '@/lib/i18n';
import type { UseModelSelectorResult } from '@/types';
import { groupedModelsToPickerGroups } from '@/utilities';

// Controller hook for the composer's model selector.
//
// It exists so `model-selector.tsx` stays a render-only component while gaining
// two things it now needs: a translated pay-as-you-go cost badge on metered
// providers, and the shared dual-consumption disclaimer pinned under the option
// list. Both are informational. Nothing here disables a model — the file's
// written invariant is that model SELECTION is always open to every plan tier
// and the server is the only gate.
export function useModelSelector(): UseModelSelectorResult {
  const { t } = useTranslation();
  const { groupedModels, isLoading } = useAvailableModels();

  const groups = useMemo(
    () => groupedModelsToPickerGroups(groupedModels, t('chat.credit.modelBadge')),
    [groupedModels, t],
  );

  return { groups, groupedModels, isLoading, t };
}
