'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useThreadShare } from '@/hooks/threads/use-thread-share';
import { useTranslation } from '@/lib/i18n';
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
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-sm font-medium">{t('chat.threadShareTitle')}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          void share.copyLink();
        }}
      >
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
          {t('chat.threadShareNative')}
        </Button>
      ) : null}
      {links.map((link) => (
        <a
          key={link.id}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('chat.threadShareOn', { platform: link.label })}
          className="border-border hover:bg-muted rounded-md border px-2.5 py-1 text-sm"
        >
          {link.label}
        </a>
      ))}
      {share.hasCopyFailed ? <p role="alert">{t('chat.threadShareCopyFailed')}</p> : null}
      <span role="status" className="sr-only">
        {share.hasCopied ? t('chat.threadShareCopied') : ''}
      </span>
    </section>
  );
}
