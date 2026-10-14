import { Activity, Pencil, Trash2 } from 'lucide-react';

import { PluginIcon } from '@/components/plugins/plugin-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  ADMIN_CURATION_HEALTH_KEYS,
  ADMIN_CURATION_HEALTH_VARIANTS,
} from '@/constants/plugin-admin-curation.constants';
import type { AdminCurationEntryRowProps } from '@/types/plugin-admin-curation.types';
import { catalogStatusKey } from '@/utilities/plugin-installs.utility';

/** One curated entry: state, health, the on/off switch and the edit, check and delete actions. */
export function AdminCurationEntryRow({
  entry,
  busy,
  onEnabled,
  onHealth,
  onEdit,
  onDelete,
  t,
}: AdminCurationEntryRowProps): React.ReactElement {
  const health = entry.health;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <PluginIcon iconKey={entry.iconKey} />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-base font-semibold break-words">{entry.name}</h3>
            <p className="text-muted-foreground text-xs break-words">
              {entry.publisher} · <code dir="ltr">{entry.slug}</code>
              {entry.version === null ? null : <span dir="ltr"> · v{entry.version}</span>}
            </p>
            {entry.url === null ? null : (
              <p className="text-muted-foreground text-xs break-all" dir="ltr">
                {entry.url}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t(catalogStatusKey(entry.status))}</Badge>
              {entry.needsVerification ? (
                <Badge variant="warning">
                  {t('pluginsAdminCatalog.entries.needsVerification')}
                </Badge>
              ) : null}
              <Badge variant={ADMIN_CURATION_HEALTH_VARIANTS[health.status]}>
                {t(ADMIN_CURATION_HEALTH_KEYS[health.status])}
              </Badge>
              {health.latencyMs === null ? null : (
                <span className="text-muted-foreground text-xs">
                  {t('pluginsAdminCatalog.entries.latency', { value: health.latencyMs })}
                </span>
              )}
              {health.errorCode === null ? null : (
                <code className="text-muted-foreground text-xs" dir="ltr">
                  {health.errorCode}
                </code>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {entry.allowedPlanSlugs.length === 0
                ? t('pluginsAdminCatalog.entries.allPlans')
                : t('pluginsAdminCatalog.entries.plans', {
                    value: entry.allowedPlanSlugs.join(', '),
                  })}
            </p>
            {entry.adminNotes === null ? null : (
              <p className="text-muted-foreground text-xs break-words">{entry.adminNotes}</p>
            )}
          </div>
          <Switch
            checked={entry.globallyEnabled}
            disabled={busy || entry.deleted}
            aria-label={t('pluginsInstall.admin.globallyEnabledFor', { value: entry.name })}
            onCheckedChange={(next) => {
              onEnabled(entry.slug, next);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onEdit(entry)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {t('common.edit')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || entry.deleted}
            onClick={() => {
              onHealth(entry.slug);
            }}
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
            {t('pluginsAdminCatalog.entries.checkHealth')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || entry.deleted}
            onClick={() => onDelete(entry)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t('common.delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
