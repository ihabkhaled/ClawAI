'use client';

import { Check, Copy, ExternalLink, LayoutGrid, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useThreadShare } from '@/hooks/threads/use-thread-share';
import { useTranslation } from '@/lib/i18n';
import type { ThreadLiveBannerProps } from '@/types/thread-publication.types';
import { boardReaderPath, slugFromThreadUrl } from '@/utilities/thread-board-list-url.utility';

/**
 * Shown right after Publish: the live address, a copy button and a button that opens the public
 * page in a new tab. It never navigates on its own, so the owner keeps Unpublish, export and
 * reader suggestions in reach and a screen reader keeps its place.
 */
export function ThreadLiveBanner({ url }: ThreadLiveBannerProps): ReactElement {
  const { t } = useTranslation();
  const share = useThreadShare({ url, title: '' });
  const slug = slugFromThreadUrl(url);

  return (
    <div
      role="status"
      data-no-print
      data-testid="thread-live-banner"
      className="border-success/40 bg-success-surface flex flex-col gap-3 rounded-lg border p-4"
    >
      <div className="flex items-start gap-3">
        <PartyPopper
          className="dark:text-success mt-0.5 h-6 w-6 shrink-0 text-green-700"
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-semibold">{t('chat.threadLiveTitle')}</p>
          <p className="text-sm">{t('chat.threadLiveBody')}</p>
        </div>
      </div>
      <Input
        readOnly
        value={url}
        dir="ltr"
        aria-label={t('chat.threadLiveLinkLabel')}
        onFocus={(event) => event.currentTarget.select()}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="w-full sm:w-auto">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            {t('chat.threadLiveOpen')}
          </a>
        </Button>
        {slug === null ? null : (
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={boardReaderPath(slug)}>
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              {t('chat.threadBoardViewOnBoard')}
            </Link>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => {
            void share.copyLink();
          }}
        >
          {share.hasCopied ? (
            <Check className="dark:text-success h-4 w-4 text-green-700" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {share.hasCopied ? t('chat.threadShareCopied') : t('chat.threadShareCopy')}
        </Button>
      </div>
      {share.hasCopyFailed ? <p role="alert">{t('chat.threadShareCopyFailed')}</p> : null}
    </div>
  );
}
