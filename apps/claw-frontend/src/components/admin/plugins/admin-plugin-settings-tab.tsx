import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type { AdminPluginSettingsTabProps } from '@/types/plugin-installs.types';

import { AdminPluginSettingRow } from './admin-plugin-setting-row';

/** The settings tab: every PluginSetting row, validated before it is sent. */
export function AdminPluginSettingsTab({
  settings,
  t,
}: AdminPluginSettingsTabProps): React.ReactElement {
  if (settings.isLoading) {
    return (
      <Skeleton
        className="min-h-48 w-full rounded-xl"
        role="status"
        aria-label={t('plugins.loading')}
      />
    );
  }
  if (settings.isError) {
    return (
      <Alert
        variant={AlertVariant.Error}
        title={t('pluginsInstall.admin.errorTitle')}
        description={t('pluginsInstall.admin.errorDescription')}
        action={
          <Button type="button" size="sm" variant="outline" onClick={settings.retry}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }
  return (
    <div className="space-y-4">
      {settings.errorMessage === null ? null : (
        <Alert variant={AlertVariant.Error} description={settings.errorMessage} />
      )}
      {settings.saved ? (
        <Alert variant={AlertVariant.Success} description={t('pluginsInstall.admin.saved')} />
      ) : null}
      <div className="divide-y rounded-lg border">
        {settings.settings.map((setting) => (
          <AdminPluginSettingRow
            key={setting.key}
            setting={setting}
            value={settings.draft[setting.key] ?? ''}
            error={settings.errors[setting.key]}
            onChange={settings.setDraftValue}
            t={t}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!settings.isDirty || settings.isSaving}
          onClick={settings.save}
        >
          {t('pluginsInstall.admin.save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!settings.isDirty || settings.isSaving}
          onClick={settings.reset}
        >
          {t('pluginsInstall.admin.reset')}
        </Button>
      </div>
    </div>
  );
}
