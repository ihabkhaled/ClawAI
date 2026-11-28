import { useCallback } from 'react';

import { useModelSizes } from '@/hooks/chat/use-model-sizes';
import { useTranslation } from '@/lib/i18n';
import type { UseModelScaleFormatterResult } from '@/types/model-scale.types';
import {
  buildModelScaleText,
  formatParameterCount,
  resolveModelScale,
} from '@/utilities/model-scale.utility';

// The size of a model for the lists that are not pickers (ADR-234): the connector's model
// table and cards, the Models compare dialog. The pickers get theirs from
// `useAvailableModels`, which builds the same text with the same utility.
export function useModelScaleFormatter(): UseModelScaleFormatterResult {
  const { t, locale } = useTranslation();
  const { lookup } = useModelSizes();

  const scaleText = useCallback(
    (provider: string, modelKey: string, contextTokens?: number | null) =>
      buildModelScaleText(
        resolveModelScale({ contextTokens, entry: lookup(provider, modelKey) }),
        t,
        locale,
      ),
    [lookup, t, locale],
  );

  const parameterLabel = useCallback(
    (provider: string, modelKey: string) =>
      formatParameterCount(lookup(provider, modelKey)?.parameterCountBillions, locale),
    [lookup, locale],
  );

  return { scaleText, parameterLabel, parametersHeading: t('modelScale.parametersLabel') };
}
