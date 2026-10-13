import type { PluginConsentListProps } from '@/types/plugin-installs.types';
import { hasConsent } from '@/utilities/plugin-installs.utility';

import { PluginConsentRow } from './plugin-consent-row';

/** Every tool of the plugin with its standing consent. Granting is explicit; nothing is granted by installing. */
export function PluginConsentList({
  tools,
  install,
  busy,
  onGrant,
  onRevoke,
  t,
}: PluginConsentListProps): React.ReactElement {
  if (tools.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{t('pluginsInstall.sheet.consentsNone')}</p>
    );
  }
  return (
    <ul className="divide-y rounded-lg border">
      {tools.map((tool) => (
        <PluginConsentRow
          key={tool.name}
          tool={tool}
          granted={hasConsent(install, tool.name)}
          busy={busy}
          onGrant={onGrant}
          onRevoke={onRevoke}
          t={t}
        />
      ))}
    </ul>
  );
}
