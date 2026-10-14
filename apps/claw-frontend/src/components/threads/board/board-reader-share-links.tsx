'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  THREAD_SHARE_APPEARANCE,
  THREAD_SHARE_FALLBACK_APPEARANCE,
} from '@/constants/thread-share-platforms.constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { BoardReaderShareLinksProps } from '@/types/thread-board-reader.types';
import { buildThreadShareLinks } from '@/utilities/thread-share-links.utility';

/** The same network icon row the public page and the owner page show, for the in-app reader. */
export function BoardReaderShareLinks({
  title,
  publicUrl,
}: BoardReaderShareLinksProps): ReactElement | null {
  const { t } = useTranslation();
  if (publicUrl === null) {
    return null;
  }
  return (
    <ul className="flex w-full flex-wrap gap-2" data-testid="board-reader-share-links">
      {buildThreadShareLinks(publicUrl, title).map((link) => {
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
  );
}
