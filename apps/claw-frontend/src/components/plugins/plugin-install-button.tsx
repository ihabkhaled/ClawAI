import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PLUGIN_GATE_REASON_KEYS,
  PLUGIN_GATE_REASONS_WITH_UPGRADE,
  PLUGIN_STATE_LABEL_KEYS,
} from '@/constants/plugin-installs.constants';
import { ROUTES } from '@/constants/routes.constants';
import { PluginInstallGateReason } from '@/enums/plugin-install-gate-reason.enum';
import type { PluginInstallButtonProps } from '@/types/plugin-installs.types';

/**
 * Install, or the state of the install that exists. A disabled Install button always says
 * why in text next to it, with an upgrade link when a bigger plan would fix it.
 */
export function PluginInstallButton({
  gate,
  install,
  limit,
  onOpen,
  t,
}: PluginInstallButtonProps): React.ReactElement {
  const reasonKey = PLUGIN_GATE_REASON_KEYS[gate.reason];
  // An install that exists already says so with its badge, so the sentence is for the button only.
  const hidesReason =
    install !== undefined && gate.reason === PluginInstallGateReason.AlreadyInstalled;
  const reasonText =
    reasonKey === null || hidesReason
      ? null
      : t(reasonKey, { value: typeof limit === 'number' ? limit : 0 });
  const showUpgrade = PLUGIN_GATE_REASONS_WITH_UPGRADE.includes(gate.reason);

  return (
    <div className="flex flex-col items-start gap-2">
      {install === undefined ? (
        <Button
          type="button"
          disabled={!gate.canInstall}
          aria-describedby={reasonText === null ? undefined : 'plugin-install-reason'}
          onClick={onOpen}
        >
          {t('pluginsInstall.install.button')}
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">{t(PLUGIN_STATE_LABEL_KEYS[install.state])}</Badge>
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.PLUGINS_INSTALLED}>{t('pluginsInstall.install.manage')}</Link>
          </Button>
        </div>
      )}
      {reasonText === null ? null : (
        <p id="plugin-install-reason" className="text-muted-foreground max-w-prose text-sm">
          {reasonText}
          {showUpgrade ? (
            <>
              {' '}
              <Link href={ROUTES.PRICING} className="text-primary font-medium underline">
                {t('pluginsInstall.install.upgrade')}
              </Link>
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
