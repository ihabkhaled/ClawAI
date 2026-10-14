import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCuratedEntryForm } from '@/hooks/plugins/use-curated-entry-form';
import type {
  AdminCurationEntryBodyProps,
  CuratedEntryDialogProps,
} from '@/types/plugin-admin-curation.types';

import { AdminCurationEntryForm } from './admin-curation-entry-form';

/** Create or edit a curated entry. The body mounts only while open, so closing drops the form and the probe key. */
export function AdminCurationEntryDialog({
  open,
  entry,
  onClose,
  t,
}: CuratedEntryDialogProps): React.ReactElement {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {open ? <AdminCurationEntryBody entry={entry} onClose={onClose} t={t} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function AdminCurationEntryBody({
  entry,
  onClose,
  t,
}: AdminCurationEntryBodyProps): React.ReactElement {
  const state = useCuratedEntryForm(entry, onClose);
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {state.isEdit
            ? t('pluginsAdminCatalog.form.editTitle')
            : t('pluginsAdminCatalog.form.createTitle')}
        </DialogTitle>
        <DialogDescription>{t('pluginsAdminCatalog.form.description')}</DialogDescription>
      </DialogHeader>
      <AdminCurationEntryForm state={state} onCancel={onClose} t={t} />
    </>
  );
}
