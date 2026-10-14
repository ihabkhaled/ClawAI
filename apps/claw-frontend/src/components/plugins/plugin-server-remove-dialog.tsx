import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PluginServerRemoveDialogProps } from '@/types/plugin-servers.types';

/** Asks before removing a server. Its saved key and tool choices go with it, and that is said here. */
export function PluginServerRemoveDialog({
  server,
  busy,
  onConfirm,
  onCancel,
  t,
}: PluginServerRemoveDialogProps): React.ReactElement {
  return (
    <Dialog
      open={server !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pluginsServers.remove.title')}</DialogTitle>
          <DialogDescription>
            {t('pluginsServers.remove.description', { value: server?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('pluginsServers.remove.cancel')}
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>
            {t('pluginsServers.remove.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
