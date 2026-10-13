import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PluginUninstallDialogProps } from '@/types/plugin-installs.types';

/** Asks before removing an install. The key and the consents go with it, and that is said here. */
export function PluginUninstallDialog({
  install,
  busy,
  onConfirm,
  onCancel,
  t,
}: PluginUninstallDialogProps): React.ReactElement {
  return (
    <Dialog
      open={install !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pluginsInstall.uninstall.title')}</DialogTitle>
          <DialogDescription>
            {t('pluginsInstall.uninstall.description', { value: install?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('pluginsInstall.uninstall.cancel')}
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>
            {t('pluginsInstall.uninstall.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
