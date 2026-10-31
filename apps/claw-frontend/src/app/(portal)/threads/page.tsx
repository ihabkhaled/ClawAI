'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import type { ReactElement } from 'react';

import { ThreadCreateDialog } from '@/components/threads/thread-create-dialog';
import { ThreadListSkeleton } from '@/components/threads/thread-list-states';
import { ThreadListView } from '@/components/threads/thread-list-view';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes.constants';
import { useToggle } from '@/hooks/common/use-toggle';
import { useTranslation } from '@/lib/i18n';

export default function ThreadPublicationsPage(): ReactElement {
  const { t } = useTranslation();
  const createDialog = useToggle(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('chat.threads')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={ROUTES.THREAD_MY_SUGGESTIONS}>{t('chat.threadCrMineLink')}</Link>
          </Button>
          <Button type="button" onClick={createDialog.open} data-tour="threads-create">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('chat.threadCreateButton')}
          </Button>
        </div>
      </div>
      <Suspense fallback={<ThreadListSkeleton />}>
        <ThreadListView />
      </Suspense>
      <ThreadCreateDialog
        open={createDialog.isOpen}
        onOpenChange={(open) => (open ? createDialog.open() : createDialog.close())}
      />
    </div>
  );
}
