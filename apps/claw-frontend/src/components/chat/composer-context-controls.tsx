'use client';

import { Brain, FolderOpen, Layers } from 'lucide-react';

import { ComposerContextPackPicker } from '@/components/chat/composer-context-pack-picker';
import { ComposerContextPacksView } from '@/components/chat/composer-context-packs-view';
import { ComposerMemoryView } from '@/components/chat/composer-memory-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ComposerContextDialog } from '@/enums/composer-context-dialog.enum';
import { useComposerContextMenu } from '@/hooks/chat/use-composer-context-menu';
import { useTranslation } from '@/lib/i18n';
import type { ComposerContextControlProps } from '@/types/composer-context.types';

/**
 * Context packs and memory behind ONE always-visible "Context" button, placed
 * first in the composer toolbar. The toolbar row scrolls sideways (rules/40
 * §11), so three separate icon buttons sat off-screen at phone widths and in
 * RTL; one button at the row's start cannot. The menu holds the pack picker and
 * two rows that open the "what will be sent" and "memory" dialogs.
 */
export function ComposerContextControls({
  threadId,
  draft,
  disabled,
}: ComposerContextControlProps): React.ReactElement {
  const { t } = useTranslation();
  const menu = useComposerContextMenu(threadId, draft);

  return (
    <>
      <Popover open={menu.menuOpen} onOpenChange={menu.onMenuOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-label={t('chat.composerContext.menuLabel')}
            title={t('chat.composerContext.menuLabel')}
            data-tour="composer-context"
            className="touch:h-11 relative h-9 shrink-0 gap-1.5 px-2.5"
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('chat.composerContext.menuLabel')}</span>
            {menu.picker.selectedCount > 0 ? (
              <Badge
                className="absolute -end-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]"
                aria-hidden="true"
              >
                {menu.picker.selectedCount}
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={8}
          className="flex w-[min(20rem,calc(100vw-1rem))] flex-col gap-3 p-3"
        >
          <ComposerContextPackPicker picker={menu.picker} />
          <div className="flex flex-col gap-1 border-t pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="touch:min-h-11 h-auto justify-start gap-2 py-2 text-start whitespace-normal"
              onClick={() => menu.openDialog(ComposerContextDialog.VIEW)}
            >
              <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('chat.composerContext.viewLabel')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="touch:min-h-11 h-auto justify-start gap-2 py-2 text-start whitespace-normal"
              onClick={() => menu.openDialog(ComposerContextDialog.MEMORY)}
            >
              <Brain className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('chat.composerContext.memoryLabel')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <ComposerContextPacksView
        preview={menu.preview}
        open={menu.dialog === ComposerContextDialog.VIEW}
        onClose={menu.closeDialog}
      />
      <ComposerMemoryView
        preview={menu.preview}
        open={menu.dialog === ComposerContextDialog.MEMORY}
        onClose={menu.closeDialog}
      />
    </>
  );
}
