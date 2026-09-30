'use client';

import { useCallback } from 'react';

import { MODEL_AUTO_VALUE } from '@/constants';
import { RoutingMode } from '@/enums';
import { useModelSelector } from '@/hooks/chat/use-model-selector';
import type { ModelPickerProps, RegenerateWithModelProps } from '@/types';
import { decodeModelValue } from '@/utilities';

/**
 * Props for "Try again with…". Reuses the composer's picker groups, so the
 * same models, badges and ordering appear in both places; the value is always
 * empty so the trigger reads as an action, not as a current selection.
 */
export function useRegenerateWithModel({
  onPick,
  disabled,
}: RegenerateWithModelProps): ModelPickerProps {
  const { groups, isLoading, t } = useModelSelector();
  const handleChange = useCallback(
    (value: string | null): void => {
      if (value === null) {
        return;
      }
      if (value === MODEL_AUTO_VALUE) {
        onPick({ routingMode: RoutingMode.AUTO });
        return;
      }
      const decoded = decodeModelValue(value);
      if (decoded === null) {
        return;
      }
      onPick({
        routingMode: RoutingMode.MANUAL_MODEL,
        provider: decoded.provider,
        model: decoded.model,
      });
    },
    [onPick],
  );
  return {
    groups,
    value: null,
    onChange: handleChange,
    disabled,
    isLoading,
    autoOption: {
      value: MODEL_AUTO_VALUE,
      label: t('chat.regenerateWith.auto'),
      shortLabel: t('chat.regenerateWith.auto'),
    },
    placeholder: t('chat.regenerateWith.trigger'),
    loadingPlaceholder: t('chat.modelSelector.loading'),
    emptyPlaceholder: t('chat.modelSelector.empty'),
    searchPlaceholder: t('chat.modelSelector.search'),
    noResultsLabel: t('chat.modelSelector.noResults'),
    ariaLabel: t('chat.regenerateWith.trigger'),
    triggerClassName: 'text-muted-foreground h-7 w-auto gap-1 border-0 px-2 text-xs shadow-none',
    useShortTriggerLabel: true,
  };
}
