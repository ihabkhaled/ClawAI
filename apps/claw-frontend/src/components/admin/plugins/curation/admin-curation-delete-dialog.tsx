import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AdminCurationDeleteDialogProps } from '@/types/plugin-admin-curation.types';

/** Soft delete needs a second click: the entry leaves the catalog for everyone and its slug stays taken. */
export function AdminCurationDeleteDialog({
  entry,
  onConfirm,
  onClose,
  t,
}: AdminCurationDeleteDialogProps): React.ReactElement {
  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('pluginsAdminCatalog.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('pluginsAdminCatalog.delete.description', { value: entry?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (entry !== null) {
                onConfirm(entry.slug);
              }
              onClose();
            }}
          >
            {t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
