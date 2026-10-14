import { useCallback, useMemo } from 'react';

import {
  THREAD_MODEL_UNAVAILABLE_REASON_KEYS,
  THREAD_NO_AVAILABILITY,
} from '@/constants/thread-recommended-team.constants';
import { ThreadModelAvailability } from '@/enums/thread-model-availability.enum';
import { useModelSelector } from '@/hooks/chat/use-model-selector';
import type {
  ThreadModelPickerController,
  UseThreadModelPickerOptions,
} from '@/types/thread-recommended-team.types';
import { encodeModelValue, decodeModelValue } from '@/utilities';
import { isThreadModelGroupKey } from '@/utilities/thread-model-defaults.utility';
import {
  annotateGroupsWithReasons,
  availabilityOf,
} from '@/utilities/thread-recommended-team.utility';

/**
 * The grouped Thread model list with unusable models marked by their reason. Choosing one is
 * ignored: the start would refuse it, so the picker never hands it to the form.
 */
export function useThreadModelPicker({
  onChange,
  availability = THREAD_NO_AVAILABILITY,
  planName = '',
}: UseThreadModelPickerOptions): ThreadModelPickerController {
  const { groups, groupedModels, isLoading, t } = useModelSelector();

  const reasonFor = useCallback(
    (status: ThreadModelAvailability): string => {
      if (status === ThreadModelAvailability.Available) {
        return '';
      }
      return t(THREAD_MODEL_UNAVAILABLE_REASON_KEYS[status], { plan: planName });
    },
    [t, planName],
  );

  const threadGroups = useMemo(
    () =>
      annotateGroupsWithReasons(
        groups.filter((group) => isThreadModelGroupKey(group.key)),
        availability,
        reasonFor,
      ),
    [groups, availability, reasonFor],
  );

  function handleChange(next: string | null): void {
    const decoded = next === null ? null : decodeModelValue(next);
    if (!decoded) {
      return;
    }
    if (availabilityOf(availability, decoded) !== ThreadModelAvailability.Available) {
      return;
    }
    const match = groupedModels
      .find((group) => group.provider === decoded.provider)
      ?.models.find((model) => model.model === decoded.model);
    if (match) {
      onChange(match);
    }
  }

  return {
    groups: threadGroups,
    isLoading,
    t,
    encode: (selection) => encodeModelValue(selection.provider, selection.model),
    handleChange,
  };
}
