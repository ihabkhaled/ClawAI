import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type { PluginInstallDialogProps } from '@/types/plugin-installs.types';

import { PluginCredentialInput } from './plugin-credential-input';
import { PluginPermissions } from './plugin-permissions';
import { PluginToolList } from './plugin-tool-list';

/**
 * The review step. Before anything is installed it shows every tool and its risk, the
 * scopes, the network hosts (or the open web) and, for a key plugin, a write-only key field.
 */
export function PluginInstallDialog({
  plugin,
  panel,
}: PluginInstallDialogProps): React.ReactElement {
  const { t } = panel;
  return (
    <Dialog
      open={panel.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          panel.closeDialog();
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('pluginsInstall.dialog.title', { value: plugin.name })}</DialogTitle>
          <DialogDescription>{t('pluginsInstall.dialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
          <section className="space-y-2">
            <h3 className="text-sm font-medium">
              {t('pluginsInstall.dialog.toolsTitle', { value: plugin.tools.length })}
            </h3>
            <PluginToolList tools={plugin.tools} t={t} />
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t('pluginsInstall.dialog.accessTitle')}</h3>
            <PluginPermissions plugin={plugin} t={t} />
          </section>
          {panel.needsCredential ? (
            <PluginCredentialInput
              id="plugin-install-credential"
              value={panel.credential}
              onChange={panel.setCredential}
              hasCredential={false}
              t={t}
            />
          ) : null}
        </div>

        {panel.errorMessage === null ? null : (
          <Alert variant={AlertVariant.Error} description={panel.errorMessage} />
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={panel.closeDialog}>
            {t('pluginsInstall.dialog.cancel')}
          </Button>
          <Button type="button" disabled={!panel.canConfirm} onClick={panel.confirm}>
            {panel.isInstalling
              ? t('pluginsInstall.install.installing')
              : t('pluginsInstall.dialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
