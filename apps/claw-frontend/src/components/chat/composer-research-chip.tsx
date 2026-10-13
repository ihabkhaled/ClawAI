'use client';

import { Globe } from 'lucide-react';

import { ComposerResearchPanel } from '@/components/chat/composer-research-panel';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COMPOSER_PLUS_POPOVER_WIDTH_CLASS } from '@/constants/composer-plus-menu.constants';
import { useComposerResearchChip } from '@/hooks/chat/use-composer-research-chip';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ComposerResearchChipProps } from '@/types/composer-plus-menu.types';
import { resolveResearchModeLabel } from '@/utilities/research-mode-label.utility';

/**
 * The toolbar's only research control: a compact chip naming the active mode, shown while
 * research is on. It opens the same panel as the "+" menu's Web research row. The loose
 * "Automatic" and "Auto Provider" selects it replaces sat in the row at all times.
 */
export function ComposerResearchChip(props: ComposerResearchChipProps): React.ReactElement {
  const { t } = useTranslation();
  const chip = useComposerResearchChip(props);
  const modeLabel = resolveResearchModeLabel(props.value.mode, t);
  const label = t('chat.composerMenu.chipLabel', { value: modeLabel });

  return (
    <Popover open={chip.open} onOpenChange={chip.onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={props.disabled}
          aria-label={label}
          title={label}
          data-tour="composer-research"
          className="text-primary touch:h-11 h-9 max-w-[9rem] shrink-0 gap-1.5 rounded-full px-2.5 text-xs"
        >
          <Globe className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{modeLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className={cn(COMPOSER_PLUS_POPOVER_WIDTH_CLASS, 'p-1')}
      >
        <ComposerResearchPanel {...props} onChange={chip.onPanelChange} />
      </PopoverContent>
    </Popover>
  );
}
