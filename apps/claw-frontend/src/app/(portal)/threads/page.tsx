'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { ThreadCreateDialog } from '@/components/threads/thread-create-dialog';
import { Button } from '@/components/ui/button';
import { useToggle } from '@/hooks/common/use-toggle';
import { useThreadPublications } from '@/hooks/threads/use-thread-publications';
import { useTranslation } from '@/lib/i18n';
import { threadReviewPath } from '@/utilities/thread-review-path.utility';

export default function ThreadPublicationsPage(): ReactElement {
  const { t } = useTranslation();
  const { data: publications = [], isLoading, isError } = useThreadPublications();
  const createDialog = useToggle(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('chat.threads')}</h1>
        <Button type="button" onClick={createDialog.open}>
          {t('chat.threadCreateButton')}
        </Button>
      </div>
      {isLoading ? <p role="status">{t('chat.loadingThreads')}</p> : null}
      {isError ? <p role="alert">{t('chat.threadPublicationsLoadFailed')}</p> : null}
      {!isLoading && !isError && publications.length === 0 ? (
        <p className="border-border bg-muted/20 text-muted-foreground rounded-lg border p-6 text-center text-sm">
          {t('chat.noThreads')}
        </p>
      ) : null}
      {publications.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {publications.map((publication) => (
            <li key={publication.id}>
              <Link
                href={threadReviewPath(publication.id)}
                className="border-border bg-card hover:bg-muted/40 flex flex-col gap-1 rounded-lg border p-4"
              >
                <span className="block font-medium">{publication.title ?? t('chat.untitled')}</span>
                <time className="text-muted-foreground text-xs" dateTime={publication.updatedAt}>
                  {new Date(publication.updatedAt).toLocaleString()}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <ThreadCreateDialog
        open={createDialog.isOpen}
        onOpenChange={(open) => (open ? createDialog.open() : createDialog.close())}
      />
    </div>
  );
}
