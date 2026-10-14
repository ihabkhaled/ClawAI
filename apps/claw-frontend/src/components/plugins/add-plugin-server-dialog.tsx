import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PluginServerDialogStep } from '@/enums/plugin-server-dialog-step.enum';
import { useAddPluginServerDialog } from '@/hooks/plugins/use-add-plugin-server-dialog';
import type {
  AddPluginServerBodyProps,
  AddPluginServerDialogProps,
} from '@/types/plugin-servers.types';

import { AddPluginServerForm } from './add-plugin-server-form';
import { PluginServerToolsPanel } from './plugin-server-tools-panel';

/** Add a server in two steps: the form, then the tools it exposes with a switch each. */
export function AddPluginServerDialog({
  open,
  onClose,
  t,
}: AddPluginServerDialogProps): React.ReactElement {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {open ? <AddPluginServerBody onClose={onClose} t={t} /> : null}
      </DialogContent>
    </Dialog>
  );
}

/** Mounted only while the dialog is open, so closing it throws the form (and the key) away. */
function AddPluginServerBody({ onClose, t }: AddPluginServerBodyProps): React.ReactElement {
  const state = useAddPluginServerDialog(onClose);
  const inTools = state.step === PluginServerDialogStep.Tools && state.created !== undefined;
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {inTools ? t('pluginsServers.tools.titleAdded') : t('pluginsServers.form.title')}
        </DialogTitle>
        <DialogDescription>
          {inTools ? t('pluginsServers.tools.description') : t('pluginsServers.form.description')}
        </DialogDescription>
      </DialogHeader>
      {inTools && state.created !== undefined ? (
        <PluginServerToolsPanel server={state.created} onDone={onClose} t={t} />
      ) : (
        <AddPluginServerForm state={state} onCancel={onClose} t={t} />
      )}
    </>
  );
}
