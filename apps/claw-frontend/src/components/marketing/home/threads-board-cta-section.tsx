'use client';

import { ArrowRight, MessagesSquare } from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { THREADS_PUBLIC_BOARD_PATH } from '@/constants/thread-board-guest.constants';
import { useTranslation } from '@/lib/i18n';
import { localisePath } from '@/utilities/locale.utility';

/**
 * Sends a visitor who has just seen what Threads are to the public board where they can read
 * real ones, free and without an account. It sits right after the Threads band on the home page.
 */
export function ThreadsBoardCtaSection(): React.ReactElement {
  const { t, locale } = useTranslation();

  return (
    <section
      id="threads-board"
      aria-labelledby="threads-board-cta-title"
      className="border-border border-b"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-4 py-14 text-center sm:px-6 lg:px-8">
        <span className="bg-primary/10 text-primary inline-flex size-12 items-center justify-center rounded-full">
          <MessagesSquare className="size-6" aria-hidden="true" />
        </span>
        <p className="text-primary text-xs font-semibold tracking-wide uppercase">
          {t('chat.threadBoardGuestHomeEyebrow')}
        </p>
        <h2
          id="threads-board-cta-title"
          className="text-foreground max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {t('chat.threadBoardGuestHomeTitle')}
        </h2>
        <p className="text-muted-foreground max-w-2xl">{t('chat.threadBoardGuestHomeBody')}</p>
        <Link
          href={localisePath(THREADS_PUBLIC_BOARD_PATH, locale)}
          className={buttonVariants({ size: 'lg' })}
        >
          {t('chat.threadBoardGuestHomeCta')}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
