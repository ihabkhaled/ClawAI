import { useMemo } from 'react';

import { ThreadSettingsError } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import type { ThreadSettingsValidation } from '@/types';
import { validateMaxTokens } from '@/utilities';

/**
 * Resolves the thread-settings form's field errors to translated text. Kept
 * separate from `useThreadSettings` so the controller hook stays focused on
 * state + persistence, and so the message mapping is unit-testable on its own.
 */
export function useThreadSettingsValidation(maxTokens: string): ThreadSettingsValidation {
  const { t } = useTranslation();

  return useMemo(() => {
    const error = validateMaxTokens(maxTokens);
    if (error === null) {
      return { maxTokensError: null, canSave: true };
    }
    const maxTokensError =
      error === ThreadSettingsError.MaxTokensNotInteger
        ? t('chat.maxTokensErrorInteger')
        : t('chat.maxTokensErrorRange');
    return { maxTokensError, canSave: false };
  }, [maxTokens, t]);
}
