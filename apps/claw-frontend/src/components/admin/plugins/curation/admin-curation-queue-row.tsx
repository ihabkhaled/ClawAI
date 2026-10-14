import { Check, X } from 'lucide-react';

import { PluginRiskBadge } from '@/components/plugins/plugin-risk-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminCurationQueueRowProps } from '@/types/plugin-admin-curation.types';
import { toRiskLevel } from '@/utilities/plugin-installs.utility';

/** One user server in the queue: who sent it, where it points, what it can do, and the decision buttons. */
export function AdminCurationQueueRow({
  server,
  busy,
  onApprove,
  onReject,
  t,
}: AdminCurationQueueRowProps): React.ReactElement {
  const pending = server.status === 'PENDING_APPROVAL';
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-semibold break-words">{server.name}</h3>
          <p className="text-muted-foreground text-xs break-all" dir="ltr">
            {server.urlHost}
            {server.urlPath}
          </p>
          <p className="text-muted-foreground text-xs break-all">
            {t('pluginsAdminCatalog.queue.submitter', { value: server.submitterUserId })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <PluginRiskBadge risk={toRiskLevel(server.highestRisk)} t={t} />
            <Badge variant="outline">
              {t('pluginsAdminCatalog.queue.tools', { value: server.toolCount })}
            </Badge>
            {server.hasCredential ? (
              <Badge variant="outline">{t('pluginsAdminCatalog.queue.hasKey')}</Badge>
            ) : null}
          </div>
          {server.decisionReason === null ? null : (
            <p className="text-muted-foreground text-xs break-words">{server.decisionReason}</p>
          )}
        </div>
        <details className="rounded-lg border">
          <summary className="min-h-11 cursor-pointer p-3 text-sm font-medium">
            {t('pluginsAdminCatalog.queue.showTools')}
          </summary>
          <ul className="divide-y border-t">
            {server.tools.map((tool) => (
              <li key={tool.name} className="space-y-1 p-3">
                <code className="block text-xs break-all" dir="ltr">
                  {tool.name}
                </code>
                <p className="text-muted-foreground text-xs break-words">{tool.description}</p>
              </li>
            ))}
          </ul>
        </details>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || !pending}
            onClick={() => {
              onApprove(server.id);
            }}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {t('pluginsAdminCatalog.queue.approve')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              onReject(server);
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t('pluginsAdminCatalog.queue.reject')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
