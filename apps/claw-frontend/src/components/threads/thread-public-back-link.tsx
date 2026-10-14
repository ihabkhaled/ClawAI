import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { THREADS_PUBLIC_BOARD_PATH } from '@/constants/thread-board-guest.constants';
import { useTranslation } from '@/lib/i18n';
import { localisePath } from '@/utilities/locale.utility';

/** The way from a public Thread back to the whole public Board, in the reader's language. */
export function ThreadPublicBackLink(): ReactElement {
  const { t, locale } = useTranslation();
  return (
    <Button asChild variant="ghost" size="sm" className="min-h-11 w-fit">
      <Link href={localisePath(THREADS_PUBLIC_BOARD_PATH, locale)} data-testid="thread-back-link">
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
        {t('chat.threadBoardGuestBackToAll')}
      </Link>
    </Button>
  );
}
