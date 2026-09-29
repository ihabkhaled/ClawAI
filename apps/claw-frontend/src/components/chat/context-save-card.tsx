'use client';

import { Brain, FolderPlus, Layers, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MEMORY_TYPE_LABELS } from '@/constants';
import { ContextSaveStatus } from '@/enums';
import { useContextSaveCard } from '@/hooks/chat/use-context-save-card';
import { useTranslation } from '@/lib/i18n';
import type { ContextSaveCardProps } from '@/types';

/**
 * What a "remember this / add this to my context" turn did (ADR-134), under
 * the answer and persisted with it: the saved memory and pack with links to
 * the exact item, the "which pack?" choice while one is pending, and a plain
 * failure line when a save could not happen. Renders from `metadata`, so a
 * reload shows exactly the same card.
 */
export function ContextSaveCard({
  messageId,
  threadId,
  record,
}: ContextSaveCardProps): React.ReactElement {
  const { t } = useTranslation();
  const card = useContextSaveCard(messageId, threadId);
  const choosing =
    record.status === ContextSaveStatus.NEEDS_PACK_CHOICE && record.pending !== undefined;

  return (
    <section
      aria-label={t('chat.contextSave.title')}
      className="border-border bg-card flex w-full min-w-0 flex-col gap-2 rounded-lg border p-3 text-sm"
    >
      {record.memory ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Brain className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">{t('chat.contextSave.savedMemory')}</span>
          <Badge variant="outline">{t(MEMORY_TYPE_LABELS[record.memory.type])}</Badge>
          <span className="text-muted-foreground min-w-0 truncate">{record.memory.preview}</span>
          <Link
            href={record.memory.link}
            className="text-primary text-xs underline underline-offset-2"
          >
            {t('chat.contextSave.openMemory')}
          </Link>
        </div>
      ) : null}
      {record.pack ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Layers className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">
            {record.pack.created
              ? t('chat.contextSave.createdPack')
              : t('chat.contextSave.addedToPack')}
          </span>
          <span className="min-w-0 truncate">{record.pack.name}</span>
          <Link
            href={record.pack.link}
            className="text-primary text-xs underline underline-offset-2"
          >
            {t('chat.contextSave.openPack')}
          </Link>
        </div>
      ) : null}
      {choosing && record.pending ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground">{t('chat.contextSave.choosePack')}</p>
          <div className="flex flex-wrap gap-2">
            {record.pending.options.map((option) => (
              <Button
                key={option.id}
                type="button"
                size="sm"
                variant="outline"
                disabled={card.isPending}
                onClick={() => card.choosePack(option.id)}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                {option.name}
              </Button>
            ))}
            <Button type="button" size="sm" disabled={card.isPending} onClick={card.chooseNewPack}>
              <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
              {t('chat.contextSave.newPack', { name: record.pending.suggestedName })}
            </Button>
          </div>
        </div>
      ) : null}
      {record.status === ContextSaveStatus.SAVING || card.isPending ? (
        <p className="text-muted-foreground flex items-center gap-2 text-xs" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {t('chat.contextSave.saving')}
        </p>
      ) : null}
      {record.memoryFailure ? (
        <p className="text-destructive text-xs" role="alert">
          {t('chat.contextSave.memoryFailed')}{' '}
          {t(`chat.contextSave.reasons.${record.memoryFailure}`)}
        </p>
      ) : null}
      {record.packFailure ? (
        <p className="text-destructive text-xs" role="alert">
          {t('chat.contextSave.packFailed')} {t(`chat.contextSave.reasons.${record.packFailure}`)}
        </p>
      ) : null}
    </section>
  );
}
