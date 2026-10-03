'use client';

import { Layers } from 'lucide-react';

import { ComposerContextPackPicker } from '@/components/chat/composer-context-pack-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDraftContextPacks } from '@/hooks/chat/use-draft-context-packs';
import { useTranslation } from '@/lib/i18n';
import type { OrchestrationContextButtonProps } from '@/types/composer-context.types';

/**
 * The lab pages' "Context" button: the same control chat has, minus the two dialogs that
 * need a thread (what will be sent, memory), because a lab run creates its thread. The
 * packs picked here are sent with the run and stored on that thread.
 */
export function OrchestrationContextButton({
  selectedIds,
  onChange,
  disabled,
}: OrchestrationContextButtonProps): React.ReactElement {
  const { t } = useTranslation();
  const picker = useDraftContextPacks({ selectedIds, onChange });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={t('chat.composerContext.menuLabel')}
          title={t('chat.composerContext.menuLabel')}
          data-testid="orchestration-context-button"
          className="touch:h-11 relative h-9 shrink-0 gap-1.5 px-2.5"
        >
          <Layers className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('chat.composerContext.menuLabel')}</span>
          {picker.selectedCount > 0 ? (
            <Badge
              className="absolute -end-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]"
              aria-hidden="true"
            >
              {picker.selectedCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="flex w-[min(20rem,calc(100vw-1rem))] flex-col gap-3 p-3"
      >
        <ComposerContextPackPicker picker={picker} />
      </PopoverContent>
    </Popover>
  );
}
