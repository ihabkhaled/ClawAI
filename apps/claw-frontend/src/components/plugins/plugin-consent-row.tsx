import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import type { PluginConsentRowProps } from '@/types/plugin-installs.types';
import { toConsentLevel } from '@/utilities/plugin-installs.utility';

import { PluginRiskBadge } from './plugin-risk-badge';

/** One tool's consent: READ needs none; WRITE and DESTRUCTIVE can be granted and revoked. */
export function PluginConsentRow({
  tool,
  granted,
  busy,
  onGrant,
  onRevoke,
  t,
}: PluginConsentRowProps): React.ReactElement {
  const level = toConsentLevel(tool.riskLevel);
  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium break-words">{tool.title}</p>
        <code className="text-muted-foreground block text-xs break-all" dir="ltr">
          {tool.name}
        </code>
        {tool.riskLevel === PluginRiskLevel.Destructive ? (
          <p className="text-muted-foreground text-xs">
            {t('pluginsInstall.sheet.consentDestructiveNote')}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PluginRiskBadge risk={tool.riskLevel} t={t} />
        {level === null ? (
          <span className="text-muted-foreground text-xs">
            {t('pluginsInstall.sheet.consentReadNote')}
          </span>
        ) : null}
        {level !== null && granted ? (
          <Badge variant="success">{t('pluginsInstall.sheet.consentGranted')}</Badge>
        ) : null}
        {level !== null && granted ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onRevoke(tool.name)}
          >
            {t('pluginsInstall.sheet.consentRevoke')}
          </Button>
        ) : null}
        {level !== null && !granted ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => onGrant(tool.name, level)}>
            {t('pluginsInstall.sheet.consentGrant')}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
