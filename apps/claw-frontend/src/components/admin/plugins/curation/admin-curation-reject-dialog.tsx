import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ADMIN_CURATION_REASON_MAX } from '@/constants/plugin-admin-curation.constants';
import type { AdminCurationRejectDialogProps } from '@/types/plugin-admin-curation.types';

/** A rejection needs a short reason; the person who registered the server is shown it. */
export function AdminCurationRejectDialog({
  server,
  reason,
  onReason,
  busy,
  onConfirm,
  onClose,
  t,
}: AdminCurationRejectDialogProps): React.ReactElement {
  const trimmed = reason.trim();
  return (
    <Dialog
      open={server !== null}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('pluginsAdminCatalog.queue.rejectTitle')}</DialogTitle>
          <DialogDescription>
            {t('pluginsAdminCatalog.queue.rejectDescription', { value: server?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label htmlFor="curation-reason" className="text-sm font-medium">
            {t('pluginsAdminCatalog.queue.reason')}
          </label>
          <Input
            id="curation-reason"
            value={reason}
            maxLength={ADMIN_CURATION_REASON_MAX}
            onChange={(event) => {
              onReason(event.target.value);
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || trimmed.length === 0}
            onClick={() => {
              if (server !== null) {
                onConfirm(server.id, trimmed);
              }
              onClose();
            }}
          >
            {t('pluginsAdminCatalog.queue.reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
