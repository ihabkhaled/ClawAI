'use client';

import { LockKeyhole, LogIn, UserPlus } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useBoardGuestLinks } from '@/hooks/threads/board/use-board-guest-links';
import { useTranslation } from '@/lib/i18n';

/**
 * The one place the guest Board says what a guest cannot do. Reading, searching and opening any
 * Thread is open; every action that needs an account points at sign-in (and sign-up) instead.
 */
export function BoardGuestBanner(): ReactElement {
  const { t } = useTranslation();
  const { signInHref, registerHref } = useBoardGuestLinks();

  return (
    <section
      aria-labelledby="board-guest-banner-title"
      data-testid="board-guest-banner"
      className="border-border bg-muted/40 flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2
          id="board-guest-banner-title"
          className="flex items-center gap-2 text-base font-semibold"
        >
          <LockKeyhole className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
          {t('chat.threadBoardGuestBannerTitle')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('chat.threadBoardGuestBannerBody')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild className="min-h-11">
          <Link href={signInHref}>
            <LogIn className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            {t('chat.threadBoardGuestSignIn')}
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <Link href={registerHref}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {t('chat.threadBoardGuestRegister')}
          </Link>
        </Button>
      </div>
    </section>
  );
}
