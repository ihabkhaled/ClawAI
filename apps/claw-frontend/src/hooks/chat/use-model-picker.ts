import { useState } from 'react';

import { MEDIA_QUERY_BELOW_MD } from '@/constants/media-query.constants';
import { useMediaQuery } from '@/hooks/ui/use-media-query';
import type { ModelPickerOption, UseModelPickerParams, UseModelPickerResult } from '@/types';

/**
 * Controller for the shared model picker.
 *
 * It exists for one behaviour that cannot live in the view: cmdk tracks a
 * *highlighted* value separately from the caller's *selected* value, and the
 * picker used to leave the highlight unset. A list of ~180 models therefore
 * opened at scroll position zero every time, so choosing a model near the
 * bottom meant scrolling back to it from the top on every visit.
 *
 * Seeding the highlight with the current selection when the picker opens makes
 * cmdk scroll that row into view for us. It has to be state rather than a
 * constant prop, because the highlight then belongs to the keyboard: arrow keys
 * and typing move it, and pinning it to the selection would break both.
 */
export function useModelPicker({
  value,
  groups,
  autoOption,
  isLoading,
  disabled,
  placeholder,
  loadingPlaceholder,
  emptyPlaceholder,
}: UseModelPickerParams): UseModelPickerResult {
  const [open, setOpen] = useState(false);
  const [highlightedValue, setHighlightedValue] = useState<string | undefined>(undefined);
  const isMobile = useMediaQuery(MEDIA_QUERY_BELOW_MD);

  const allOptions: ModelPickerOption[] = autoOption
    ? [autoOption, ...groups.flatMap((group) => group.options)]
    : groups.flatMap((group) => group.options);
  const selectedOption = allOptions.find((option) => option.value === value) ?? null;

  const totalOptionCount = groups.reduce((sum, group) => sum + group.options.length, 0);
  const isEmpty = isLoading !== true && totalOptionCount === 0 && autoOption === undefined;
  const isDisabled = disabled === true || isLoading === true || isEmpty;

  const resolveLabel = (short: boolean): string => {
    if (isLoading === true) {
      return loadingPlaceholder;
    }
    if (isEmpty) {
      return emptyPlaceholder;
    }
    if (selectedOption === null) {
      return placeholder;
    }
    return short ? (selectedOption.shortLabel ?? selectedOption.label) : selectedOption.label;
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      // Seed on open, not on every render: this is where "start at the current
      // choice" is decided, and after that the highlight is the keyboard's.
      setHighlightedValue(value ?? undefined);
    }
  };

  return {
    open,
    isMobile,
    isDisabled,
    selectedOption,
    highlightedValue,
    triggerLabel: resolveLabel(false),
    triggerShortLabel: resolveLabel(true),
    onOpenChange: handleOpenChange,
    onHighlightChange: setHighlightedValue,
    close: () => setOpen(false),
  };
}
