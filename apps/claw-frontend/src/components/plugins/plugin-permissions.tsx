import {
  PLUGIN_AUTH_LABEL_KEYS,
  PLUGIN_RISK_HINT_KEYS,
  PLUGIN_RISK_ORDER,
} from '@/constants/plugins.constants';
import type { PluginPermissionsProps } from '@/types/plugins.types';
import { normalizeScope } from '@/utilities/plugins.utility';

import { PluginRiskBadge } from './plugin-risk-badge';

/**
 * What using this plugin means: how it signs in, which scopes it asks for, which
 * hosts it can reach, and what each risk level lets a tool do. Plain facts so a
 * person can decide before anything is installed.
 */
export function PluginPermissions({ plugin, t }: PluginPermissionsProps): React.ReactElement {
  const scopes = plugin.auth.scopes.map(normalizeScope);
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-sm font-medium">{t('plugins.detail.authTitle')}</dt>
          <dd className="text-muted-foreground text-sm">
            {t(PLUGIN_AUTH_LABEL_KEYS[plugin.auth.kind])}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-sm font-medium">{t('plugins.detail.networkTitle')}</dt>
          <dd className="text-muted-foreground text-sm">
            {plugin.network.publicWeb ? <p>{t('plugins.detail.networkPublicWeb')}</p> : null}
            {plugin.network.hosts.length > 0 ? (
              <ul className="space-y-1">
                {plugin.network.hosts.map((host) => (
                  <li key={host}>
                    <code className="break-all" dir="ltr">
                      {host}
                    </code>
                  </li>
                ))}
              </ul>
            ) : null}
            {!plugin.network.publicWeb && plugin.network.hosts.length === 0
              ? t('plugins.detail.networkNone')
              : null}
          </dd>
        </div>
      </dl>

      {scopes.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t('plugins.detail.scopesTitle')}</h3>
          <ul className="space-y-1">
            {scopes.map((scope) => (
              <li key={scope.id} className="text-muted-foreground text-sm">
                <code dir="ltr">{scope.id}</code>
                {scope.description !== undefined && scope.description.length > 0
                  ? ` - ${scope.description}`
                  : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t('plugins.detail.riskTitle')}</h3>
        <ul className="space-y-2">
          {PLUGIN_RISK_ORDER.map((risk) => (
            <li key={risk} className="flex flex-wrap items-start gap-2">
              <PluginRiskBadge risk={risk} t={t} />
              <span className="text-muted-foreground min-w-0 flex-1 text-sm">
                {t(PLUGIN_RISK_HINT_KEYS[risk])}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
