import { useCallback, useState } from 'react';

import { COMPOSER_PLUS_TRIGGER_SELECTOR } from '@/constants/composer-plus-menu.constants';
import { ResearchMode } from '@/enums/research-mode.enum';
import type {
  ComposerResearchChipProps,
  UseComposerResearchChipReturn,
} from '@/types/composer-plus-menu.types';

/**
 * Open state for the research chip's popover. Choosing "No research" removes the chip from
 * the row, and the focus it held would fall to <body>; hand it to the "+" button instead.
 */
export function useComposerResearchChip({
  onChange,
}: Pick<ComposerResearchChipProps, 'onChange'>): UseComposerResearchChipReturn {
  const [open, setOpen] = useState(false);

  const onPanelChange = useCallback<ComposerResearchChipProps['onChange']>(
    (value) => {
      onChange(value);
      if (value.mode === ResearchMode.NONE) {
        setOpen(false);
        document.querySelector<HTMLElement>(COMPOSER_PLUS_TRIGGER_SELECTOR)?.focus();
      }
    },
    [onChange],
  );

  return { open, onOpenChange: setOpen, onPanelChange };
}
