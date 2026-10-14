import { KeyRound, Server, Trash2, Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { PluginServerStatus } from '@/enums/plugin-server-status.enum';
import type { PluginServerCardProps } from '@/types/plugin-servers.types';

import { PluginServerStatusBadge } from './plugin-server-status-badge';

/** One of the user's own servers: name, address, status, the switch, and its tools and remove buttons. */
export function PluginServerCard({
  server,
  isPending,
  onToggle,
  onTools,
  onRemove,
  t,
}: PluginServerCardProps): React.ReactElement {
  const canToggle = server.status === PluginServerStatus.Approved || server.enabled;
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <span className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Server className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold">{server.name}</h3>
            <p className="text-muted-foreground truncate text-xs" dir="ltr" title={server.url}>
              {server.url}
            </p>
          </div>
          <Switch
            checked={server.enabled}
            disabled={!canToggle || isPending}
            aria-label={t('pluginsServers.card.enabledLabel', { value: server.name })}
            onCheckedChange={(enabled) => {
              onToggle(server, enabled);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PluginServerStatusBadge status={server.status} t={t} />
          <span className="text-muted-foreground text-xs">
            {t('pluginsServers.card.toolsEnabled', { count: server.toolCount })}
          </span>
          {server.hasCredential ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              {t('pluginsServers.card.keySaved')}
            </span>
          ) : null}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onTools(server);
            }}
          >
            <Wrench className="me-2 h-4 w-4" aria-hidden="true" />
            {t('pluginsServers.card.tools')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => {
              onRemove(server);
            }}
          >
            <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
            {t('pluginsServers.card.remove')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
