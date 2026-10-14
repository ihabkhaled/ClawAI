import { Loader2, ShieldAlert } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { usePluginServerTools } from '@/hooks/plugins/use-plugin-server-tools';
import type { PluginServerToolsPanelProps } from '@/types/plugin-servers.types';

import { PluginServerToolRow } from './plugin-server-tool-row';

/** Discovery results for one server, with the risk warning and a switch per tool. */
export function PluginServerToolsPanel({
  server,
  onDone,
  t,
}: PluginServerToolsPanelProps): React.ReactElement {
  const state = usePluginServerTools(server, onDone);
  return (
    <div className="space-y-4">
      <Alert
        variant={AlertVariant.Warning}
        icon={ShieldAlert}
        description={t('pluginsServers.tools.warning')}
      />
      {state.errorMessage === null ? null : (
        <Alert variant={AlertVariant.Error} description={state.errorMessage} />
      )}

      {state.isDiscovering ? (
        <div className="space-y-2" role="status" aria-label={t('pluginsServers.tools.discovering')}>
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ) : null}

      {!state.isDiscovering && state.tools.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('pluginsServers.tools.none')}</p>
      ) : null}

      {state.tools.length > 0 ? (
        <ul className="max-h-72 space-y-2 overflow-y-auto pe-1">
          {state.tools.map((tool) => (
            <PluginServerToolRow key={tool.name} tool={tool} onToggle={state.toggle} t={t} />
          ))}
        </ul>
      ) : null}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          disabled={state.isDiscovering}
          onClick={state.rediscover}
        >
          {t('pluginsServers.tools.rediscover')}
        </Button>
        <Button
          type="button"
          disabled={state.isDiscovering || state.isSaving || state.tools.length === 0}
          onClick={state.save}
        >
          {state.isSaving ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {t('pluginsServers.tools.save')}
        </Button>
      </DialogFooter>
    </div>
  );
}
