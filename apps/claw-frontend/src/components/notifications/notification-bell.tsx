'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { NotificationRow } from '@/components/notifications/notification-row';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  NOTIFICATIONS_MAX_BADGE,
  NOTIFICATIONS_SETTINGS_PATH,
} from '@/constants/notifications.constants';
import { useNotificationBell } from '@/hooks/notifications/use-notification-bell';
import { useTranslation } from '@/lib/i18n';
import { localisePath } from '@/utilities/locale.utility';

/**
 * The notification bell: a badge with the unread count and a panel with the list. The panel is
 * fetched only when opened; the badge refreshes while the tab is visible.
 */
export function NotificationBell(): ReactElement {
  const { t, locale } = useTranslation();
  const bell = useNotificationBell();
  const badge =
    bell.unreadCount > NOTIFICATIONS_MAX_BADGE
      ? `${String(NOTIFICATIONS_MAX_BADGE)}+`
      : String(bell.unreadCount);
  const label =
    bell.unreadCount > 0
      ? `${t('notifications.bellLabel')}: ${t('notifications.unreadCount', { count: bell.unreadCount })}`
      : t('notifications.bellLabel');

  return (
    <Popover open={bell.isOpen} onOpenChange={bell.setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative shrink-0"
          aria-label={label}
          title={label}
          data-testid="notification-bell"
          data-tour="notification-bell"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {bell.unreadCount > 0 ? (
            <span
              data-testid="notification-badge"
              className="bg-destructive text-destructive-foreground absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold"
              aria-hidden="true"
            >
              {badge}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96" data-testid="notification-panel">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <h2 className="text-sm font-semibold">{t('notifications.title')}</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={bell.markAllRead}
            disabled={bell.unreadCount === 0}
          >
            {t('notifications.markAllRead')}
          </Button>
        </div>
        {bell.isLoading ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm" role="status">
            {t('notifications.loading')}
          </p>
        ) : null}
        {bell.isError ? (
          <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
            <p className="text-destructive text-sm">{t('notifications.error')}</p>
            <Button type="button" variant="outline" size="sm" onClick={bell.retry}>
              {t('notifications.retry')}
            </Button>
          </div>
        ) : null}
        {!bell.isLoading && !bell.isError && bell.items.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            {t('notifications.empty')}
          </p>
        ) : null}
        {bell.items.map((item) => (
          <NotificationRow
            key={item.id}
            item={item}
            text={bell.rowText(item)}
            onSelect={bell.select}
          />
        ))}
        {bell.hasMore ? (
          <div className="flex justify-center border-b px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={bell.loadMore}
              disabled={bell.isLoadingMore}
            >
              {t('notifications.showOlder')}
            </Button>
          </div>
        ) : null}
        <div className="px-3 py-2">
          <Link
            href={localisePath(NOTIFICATIONS_SETTINGS_PATH, locale)}
            className="text-primary text-xs hover:underline"
            onClick={() => bell.setOpen(false)}
          >
            {t('notifications.settings')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
