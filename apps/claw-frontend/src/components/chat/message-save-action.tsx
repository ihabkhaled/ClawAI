'use client';

import { BookmarkPlus, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SaveToContextTarget } from '@/enums/save-to-context-target.enum';
import { useMessageSaveAction } from '@/hooks/chat/use-message-save-action';
import { useTranslation } from '@/lib/i18n';
import type { MessageSaveActionProps } from '@/types/composer-context.types';

/**
 * "Save as context pack / Save to memory" under an answer. The reliable route
 * for "save this": it works with every model because no model is involved.
 */
export function MessageSaveAction({ messageId }: MessageSaveActionProps): React.ReactElement {
  const { t } = useTranslation();
  const action = useMessageSaveAction(messageId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={action.isPending}
          aria-label={t('chat.saveMessage.menuLabel')}
          title={t('chat.saveMessage.menuLabel')}
          className="text-muted-foreground h-7 w-7"
        >
          {action.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onSelect={() => action.save(SaveToContextTarget.CONTEXT_PACK)}>
          {t('chat.saveMessage.pack')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => action.save(SaveToContextTarget.MEMORY)}>
          {t('chat.saveMessage.memory')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
