'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactElement } from 'react';

import { ThreadPublicationDetail } from '@/components/threads/thread-publication-detail';
import { ROUTES } from '@/constants/routes.constants';
import { useThreadPublicationDetail } from '@/hooks/threads/use-thread-publication-detail';
import { useTranslation } from '@/lib/i18n';
import { parsePublicationIdParam } from '@/utilities/thread-publication-id-param.utility';

export default function ThreadPublicationReviewPage(): ReactElement {
  const { t } = useTranslation();
  const params = useParams<{ publicationId: string }>();
  const publicationId = parsePublicationIdParam(params.publicationId ?? null);
  const detail = useThreadPublicationDetail(publicationId);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={ROUTES.THREAD_PUBLICATIONS} className="text-primary text-sm underline">
          {t('chat.threadBackToList')}
        </Link>
        <h1 className="text-2xl font-semibold">
          {detail.selectedPublication?.title ?? t('chat.threads')}
        </h1>
      </div>
      {publicationId === '' ? (
        <p role="alert">{t('chat.threadPublicUnavailable')}</p>
      ) : (
        <ThreadPublicationDetail detail={detail} />
      )}
    </div>
  );
}
