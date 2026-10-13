import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { PLUGIN_STATE_LABEL_KEYS } from '@/constants/plugin-installs.constants';
import { ROUTES } from '@/constants/routes.constants';
import { PluginAuthKind } from '@/enums/plugin-auth-kind.enum';
import type { InstalledPluginCardProps } from '@/types/plugin-installs.types';
import { isEnabled, isUnavailable } from '@/utilities/plugin-installs.utility';

import { PluginIcon } from './plugin-icon';

/** One install: state, the enable switch, and the buttons for settings and uninstall. */
export function InstalledPluginCard({
  install,
  isPending,
  onToggle,
  onSettings,
  onUninstall,
  t,
}: InstalledPluginCardProps): React.ReactElement {
  const unavailable = isUnavailable(install);
  const needsKey = install.authKind === PluginAuthKind.ApiKey;
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <span className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <PluginIcon iconKey={install.iconKey} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold">
              <Link href={ROUTES.PLUGIN_DETAIL(install.slug)} className="hover:underline">
                {install.name}
              </Link>
            </h3>
            <p className="text-muted-foreground text-xs">
              {t('plugins.detail.version', { value: install.version })}
            </p>
          </div>
          <Switch
            checked={isEnabled(install)}
            disabled={unavailable || isPending}
            aria-label={t('pluginsInstall.installed.enabledLabel', { value: install.name })}
            onCheckedChange={(enabled) => {
              onToggle(install, enabled);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={unavailable ? 'destructive' : 'secondary'}>
            {t(PLUGIN_STATE_LABEL_KEYS[install.state])}
          </Badge>
          {needsKey ? (
            <Badge variant={install.credential.hasCredential ? 'success' : 'warning'}>
              {install.credential.hasCredential
                ? t('pluginsInstall.credential.saved')
                : t('pluginsInstall.credential.notSet')}
            </Badge>
          ) : null}
          {install.latestVersion !== null && install.latestVersion !== install.version ? (
            <Badge variant="info">
              {t('pluginsInstall.installed.updateAvailable', { value: install.latestVersion })}
            </Badge>
          ) : null}
        </div>

        {unavailable ? (
          <p className="text-muted-foreground text-sm">
            {t('pluginsInstall.installed.unavailableHelp')}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onSettings(install)}>
            {t('pluginsInstall.installed.settings')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onUninstall(install)}>
            {t('pluginsInstall.installed.uninstall')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
