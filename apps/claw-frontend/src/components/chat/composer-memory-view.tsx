'use client';

import { Brain } from 'lucide-react';
import Link from 'next/link';

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
import { ROUTES } from '@/constants/routes.constants';
import { useComposerContextPreview } from '@/hooks/chat/use-composer-context-preview';
import { useTranslation } from '@/lib/i18n';
import type { ComposerContextControlProps } from '@/types/composer-context.types';

/**
 * The memory this chat is using: whether memory is on at all, and which
 * memories the next message would pull in. Same server dry-run as the pack view.
 */
export function ComposerMemoryView({
  threadId,
  draft,
  disabled,
}: ComposerContextControlProps): React.ReactElement {
  const { t } = useTranslation();
  const view = useComposerContextPreview(threadId, draft);
  const memories = view.bundle?.memories ?? [];

  return (
    <Dialog open={view.open} onOpenChange={view.onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label={t('chat.composerContext.memoryLabel')}
          title={t('chat.composerContext.memoryLabel')}
          className="touch:h-11 touch:w-11 h-9 w-9 shrink-0"
        >
          <Brain className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('chat.composerContext.memoryTitle')}</DialogTitle>
          <DialogDescription>{t('chat.composerContext.memoryDescription')}</DialogDescription>
        </DialogHeader>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={view.useMemory ? 'success' : 'outline'}>
            {view.useMemory
              ? t('chat.composerContext.memoryOn')
              : t('chat.composerContext.memoryOff')}
          </Badge>
        </p>
        {view.isLoading ? (
          <p className="text-muted-foreground text-sm">{t('preview.loading')}</p>
        ) : null}
        {view.isError ? <p className="text-destructive text-sm">{t('preview.failed')}</p> : null}
        {view.useMemory && view.bundle !== null && memories.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('chat.composerContext.memoryNone')}</p>
        ) : null}
        {view.useMemory && memories.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {memories.map((memory) => (
              <li
                key={memory.id}
                className="min-w-0 rounded-md border p-2 text-xs break-words whitespace-pre-wrap"
              >
                {memory.content ?? t('preview.redactedPlaceholder')}
              </li>
            ))}
          </ul>
        ) : null}
        <Link href={ROUTES.MEMORY} className="text-primary text-xs underline underline-offset-2">
          {t('chat.composerContext.memoryManage')}
        </Link>
      </DialogContent>
    </Dialog>
  );
}
