'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { ThreadMyChangeRequestsPanel } from '@/components/threads/thread-my-change-requests-panel';
import { ROUTES } from '@/constants/routes.constants';
import { useTranslation } from '@/lib/i18n';

export default function ThreadMySuggestionsPage(): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link
        href={ROUTES.THREAD_PUBLICATIONS}
        className="text-primary inline-flex min-h-11 items-center gap-1 self-start text-sm underline"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {t('chat.threadBackToList')}
      </Link>
      <ThreadMyChangeRequestsPanel />
    </div>
  );
}
