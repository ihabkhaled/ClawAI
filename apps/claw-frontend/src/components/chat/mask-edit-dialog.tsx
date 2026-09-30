import { MaskEditDialogBody } from '@/components/chat/mask-edit-dialog-body';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n';
import type { MaskEditDialogProps } from '@/types/image-mask-editor.types';

/**
 * "Mask edit": paint the part of an attached image the model may change. Open
 * while `fileId` is set. DialogContent already renders the close button, so
 * this adds none. Full width at 360px, capped on a desktop.
 */
export function MaskEditDialog({
  fileId,
  onClose,
  onApplied,
}: MaskEditDialogProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Dialog
      open={fileId !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="flex max-h-[95dvh] w-[min(52rem,96vw)] max-w-none flex-col overflow-y-auto"
        data-testid="mask-edit-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('chat.maskEdit.title')}</DialogTitle>
          <DialogDescription>{t('chat.maskEdit.description')}</DialogDescription>
        </DialogHeader>
        {fileId === null ? null : (
          <MaskEditDialogBody
            key={fileId}
            fileId={fileId}
            onClose={onClose}
            onApplied={onApplied}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
