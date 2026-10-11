'use client';

import type { ReactElement } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useNotificationPreferences } from '@/hooks/notifications/use-notification-preferences';
import { useTranslation } from '@/lib/i18n';

/** The channels a person chooses for notifications. In-app and email today; push comes later. */
export function NotificationPreferencesCard(): ReactElement {
  const { t } = useTranslation();
  const { preferences, isLoading, isSaving, save } = useNotificationPreferences();
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
      </CardContent>
    </Card>
  );
}
