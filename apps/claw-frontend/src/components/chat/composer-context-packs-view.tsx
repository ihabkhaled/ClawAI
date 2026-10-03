'use client';

import { FolderOpen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useComposerContextPreview } from '@/hooks/chat/use-composer-context-preview';
import { useTranslation } from '@/lib/i18n';
import type { ComposerContextControlProps } from '@/types/composer-context.types';

/**
 * Shows the context-pack content the next message will carry, grouped by pack.
 * It reads the server's own dry-run, so "attached" here means "will be sent":
 * a switched-off context says so instead of listing packs that would not go.
 */
export function ComposerContextPacksView({
  threadId,
  draft,
  disabled,
}: ComposerContextControlProps): React.ReactElement {
  const { t } = useTranslation();
  const view = useComposerContextPreview(threadId, draft);

  return (
    <Dialog open={view.open} onOpenChange={view.onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label={t('chat.composerContext.viewLabel')}
          title={t('chat.composerContext.viewLabel')}
          className="touch:h-11 touch:w-11 h-9 w-9 shrink-0"
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('chat.composerContext.viewTitle')}</DialogTitle>
          <DialogDescription>{t('chat.composerContext.viewDescription')}</DialogDescription>
        </DialogHeader>
        {view.isLoading ? (
          <p className="text-muted-foreground text-sm">{t('preview.loading')}</p>
        ) : null}
        {view.isError ? <p className="text-destructive text-sm">{t('preview.failed')}</p> : null}
        {!view.useContext ? (
          <p className="text-muted-foreground text-sm">{t('chat.composerContext.viewDisabled')}</p>
        ) : null}
        {view.useContext && view.bundle !== null && view.packGroups.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('chat.composerContext.viewNone')}</p>
        ) : null}
        {view.useContext
          ? view.packGroups.map((group) => (
              <section key={group.packId} className="flex flex-col gap-2">
                <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  <span className="min-w-0 break-words">{group.name}</span>
                  <Badge variant="outline">
                    {t('chat.composerContext.viewItems', { value: String(group.items.length) })}
                  </Badge>
                </h3>
                <ul className="flex flex-col gap-2">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className="min-w-0 rounded-md border p-2 text-xs break-words whitespace-pre-wrap"
                    >
                      {item.content ?? t('preview.redactedPlaceholder')}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          : null}
      </DialogContent>
    </Dialog>
  );
}
