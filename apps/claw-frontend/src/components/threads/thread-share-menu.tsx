'use client';

import { Check, Link2, Share2 } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  THREAD_SHARE_APPEARANCE,
  THREAD_SHARE_FALLBACK_APPEARANCE,
} from '@/constants/thread-share-platforms.constants';
import { useThreadShare } from '@/hooks/threads/use-thread-share';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ThreadShareMenuProps } from '@/types/thread-export.types';
import { buildThreadShareLinks } from '@/utilities/thread-share-links.utility';

/** Copy the link, hand it to any app through the device's share sheet, or post it to a network. */
export function ThreadShareMenu({ url, title }: ThreadShareMenuProps): ReactElement {
  const { t } = useTranslation();
  const share = useThreadShare({ url, title });
  const links = buildThreadShareLinks(url, title);

  return (
    <section
      data-no-print
      data-tour="thread-review-share"
      data-testid="thread-share-menu"
      aria-label={t('chat.threadShareTitle')}
      className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Share2 className="text-muted-foreground h-4 w-4" aria-hidden="true" />
        <span className="text-sm font-medium">{t('chat.threadShareTitle')}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ms-auto"
          onClick={() => {
            void share.copyLink();
          }}
        >
          {share.hasCopied ? (
            <Check className="dark:text-success h-4 w-4 text-green-700" aria-hidden="true" />
          ) : (
            <Link2 className="h-4 w-4" aria-hidden="true" />
          )}
          {share.hasCopied ? t('chat.threadShareCopied') : t('chat.threadShareCopy')}
        </Button>
        {share.canShareNatively ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void share.shareNatively();
            }}
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            {t('chat.threadShareNative')}
          </Button>
        ) : null}
      </div>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => {
          const { Icon, hoverClass } =
            THREAD_SHARE_APPEARANCE[link.id] ?? THREAD_SHARE_FALLBACK_APPEARANCE;
          const label = t('chat.threadShareOn', { platform: link.label });
          return (
            <li key={link.id}>
              <Button asChild variant="outline" size="icon">
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className={cn('text-muted-foreground', hoverClass)}
                >
                  <Icon className="h-5 w-5" />
                </a>
              </Button>
            </li>
          );
        })}
      </ul>
      {share.hasCopyFailed ? <p role="alert">{t('chat.threadShareCopyFailed')}</p> : null}
      <span role="status" className="sr-only">
        {share.hasCopied ? t('chat.threadShareCopied') : ''}
      </span>
    </section>
  );
}
