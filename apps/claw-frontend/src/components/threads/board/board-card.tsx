'use client';

import {
  ArrowRight,
  CalendarClock,
  Clock,
  Eye,
  Link2,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { RelativeTime } from '@/components/shared/relative-time';
import { ThreadAuthorBadge } from '@/components/threads/community/thread-author-badge';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BadgeVariant } from '@/enums/badge-variant.enum';
import { useBoardItemHref } from '@/hooks/threads/board/use-board-item-href';
import { useTranslation } from '@/lib/i18n';
import type { BoardCardProps } from '@/types/thread-board-view.types';
import { boardLanguageLabel, boardTypeLabelKey } from '@/utilities/thread-board-view.utility';

export function BoardCard({ item }: BoardCardProps): ReactElement {
  const { t } = useTranslation();
  const itemHref = useBoardItemHref();
  const typeKey = boardTypeLabelKey(item.publicationType);
  const stats = [
    { Icon: Clock, text: t('chat.threadBoardReadingMinutes', { minutes: item.readingMinutes }) },
    { Icon: Link2, text: t('chat.threadBoardSources', { count: item.sourceCount }) },
    { Icon: ThumbsUp, text: t('chat.threadBoardLikes', { count: item.likeCount }) },
    { Icon: MessageSquare, text: t('chat.threadBoardComments', { count: item.commentCount }) },
    { Icon: Eye, text: t('chat.threadBoardViews', { count: item.viewCount }) },
  ];

  return (
    <Card
      variant="interactive"
      className="focus-within:ring-ring group relative flex h-full flex-col gap-3 p-4 focus-within:ring-2"
      data-testid="board-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={BadgeVariant.SECONDARY}>{boardLanguageLabel(item.contentLocale)}</Badge>
        {typeKey ? <Badge variant={BadgeVariant.OUTLINE}>{t(typeKey)}</Badge> : null}
      </div>
      <h2 className="text-base leading-snug font-semibold">
        <Link
          href={itemHref(item.slug)}
          className="flex min-h-11 items-center rounded-sm outline-none after:absolute after:inset-0"
        >
          <span className="line-clamp-2">{item.title}</span>
        </Link>
      </h2>
      <p className="text-muted-foreground line-clamp-3 text-sm">{item.excerpt}</p>
      {item.owner ? <ThreadAuthorBadge author={item.owner} compact /> : null}
      <ul className="text-muted-foreground mt-auto flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {stats.map(({ Icon, text }) => (
          <li key={text} className="flex items-center gap-1">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{text}</span>
          </li>
        ))}
        <li className="flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          <RelativeTime value={item.publishedAt} />
        </li>
      </ul>
      <span className="text-primary flex items-center gap-1 text-sm font-medium">
        {t('chat.threadBoardRead')}
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Card>
  );
}
