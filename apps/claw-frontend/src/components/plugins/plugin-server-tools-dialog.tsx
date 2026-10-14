import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PluginServerToolsDialogProps } from '@/types/plugin-servers.types';

import { PluginServerToolsPanel } from './plugin-server-tools-panel';

/** The tools of a server already on the list: connect again, review, switch tools on or off. */
export function PluginServerToolsDialog({
  server,
  onClose,
  t,
}: PluginServerToolsDialogProps): React.ReactElement {
  return (
    <Dialog
      open={server !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('pluginsServers.tools.title', { value: server?.name ?? '' })}
          </DialogTitle>
          <DialogDescription>{t('pluginsServers.tools.description')}</DialogDescription>
        </DialogHeader>
        {server === undefined ? null : (
          <PluginServerToolsPanel key={server.id} server={server} onDone={onClose} t={t} />
        )}
      </DialogContent>
    </Dialog>
  );
}
