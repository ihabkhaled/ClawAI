'use client';

import type { ReactElement } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useNotificationPreferences } from '@/hooks/notifications/use-notification-preferences';
import { usePushNotifications } from '@/hooks/notifications/use-push-notifications';
import { useTranslation } from '@/lib/i18n';

/** The channels a person chooses for notifications: in the app, by email, and push on this browser. */
export function NotificationPreferencesCard(): ReactElement {
  const { t } = useTranslation();
  const { preferences, isLoading, isSaving, save } = useNotificationPreferences();
  const push = usePushNotifications();
  const disabled = preferences === null || isLoading || isSaving;

  return (
    <Card data-testid="notification-preferences-card" data-tour="settings-notifications">
      <CardHeader>
        <CardTitle className="text-lg">{t('notifications.preferences.title')}</CardTitle>
        <CardDescription>{t('notifications.preferences.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <label htmlFor="notification-in-app" className="text-sm font-medium">
              {t('notifications.preferences.inApp')}
            </label>
            <p className="text-muted-foreground text-xs">
              {t('notifications.preferences.inAppHint')}
            </p>
          </div>
          <Switch
            id="notification-in-app"
            checked={preferences?.inAppEnabled ?? true}
            disabled={disabled}
            onCheckedChange={(value) => save({ inAppEnabled: value })}
            aria-label={t('notifications.preferences.inApp')}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <label htmlFor="notification-email" className="text-sm font-medium">
              {t('notifications.preferences.email')}
            </label>
            <p className="text-muted-foreground text-xs">
              {t('notifications.preferences.emailHint')}
            </p>
          </div>
          <Switch
            id="notification-email"
            checked={preferences?.emailEnabled ?? true}
            disabled={disabled}
            onCheckedChange={(value) => save({ emailEnabled: value })}
            aria-label={t('notifications.preferences.email')}
          />
        </div>
        {push.isAvailable ? (
          <div
            className="flex items-center justify-between gap-4"
            data-testid="notification-push-row"
          >
            <div>
              <label htmlFor="notification-push" className="text-sm font-medium">
                {t('notifications.preferences.push')}
              </label>
              <p className="text-muted-foreground text-xs">
                {push.isBlocked
                  ? t('notifications.preferences.pushBlocked')
                  : t('notifications.preferences.pushHint')}
              </p>
            </div>
            <Switch
              id="notification-push"
              checked={push.isSubscribed && (preferences?.pushEnabled ?? false)}
              disabled={disabled || push.isBusy || push.isBlocked}
              onCheckedChange={push.toggle}
              aria-label={t('notifications.preferences.push')}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
