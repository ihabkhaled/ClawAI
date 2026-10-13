import { PluginIcon } from '@/components/plugins/plugin-icon';
import { PluginRiskBadge } from '@/components/plugins/plugin-risk-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { AdminPluginCatalogRowProps } from '@/types/plugin-installs.types';
import { catalogStatusKey, toRiskLevel } from '@/utilities/plugin-installs.utility';

/** One catalog entry: the global kill switch, featured, and a switch per tool. */
export function AdminPluginCatalogRow({
  entry,
  busy,
  onGloballyEnabled,
  onFeatured,
  onToolDisabled,
  t,
}: AdminPluginCatalogRowProps): React.ReactElement {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <span className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <PluginIcon iconKey={entry.iconKey} />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-base font-semibold break-words">{entry.name}</h3>
            <p className="text-muted-foreground text-xs break-words">
              {entry.publisher} · <code dir="ltr">{entry.slug}</code>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t(catalogStatusKey(entry.status))}</Badge>
              <span className="text-muted-foreground text-xs">
                {t('pluginsInstall.admin.installs', { value: entry.installCount })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="min-w-0 text-sm">{t('pluginsInstall.admin.globallyEnabled')}</span>
            <Switch
              checked={entry.globallyEnabled}
              disabled={busy}
              aria-label={t('pluginsInstall.admin.globallyEnabledFor', { value: entry.name })}
              onCheckedChange={(next) => onGloballyEnabled(entry.slug, next)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="min-w-0 text-sm">{t('pluginsInstall.admin.featured')}</span>
            <Switch
              checked={entry.featured}
              disabled={busy}
              aria-label={t('pluginsInstall.admin.featuredFor', { value: entry.name })}
              onCheckedChange={(next) => onFeatured(entry.slug, next)}
            />
          </div>
        </div>

        <details className="rounded-lg border">
          <summary className="min-h-11 cursor-pointer p-3 text-sm font-medium">
            {t('pluginsInstall.admin.tools', { value: entry.tools.length })}
          </summary>
          <ul className="divide-y border-t">
            {entry.tools.map((tool) => (
              <li key={tool.name} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <code className="block text-xs break-all" dir="ltr">
                    {tool.name}
                  </code>
                  <PluginRiskBadge risk={toRiskLevel(tool.riskLevel)} t={t} />
                </div>
                <Switch
                  checked={!tool.disabledByAdmin}
                  disabled={busy}
                  aria-label={t('pluginsInstall.admin.toolEnabledFor', { value: tool.name })}
                  onCheckedChange={(next) => onToolDisabled(entry.slug, tool.name, !next)}
                />
              </li>
            ))}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
