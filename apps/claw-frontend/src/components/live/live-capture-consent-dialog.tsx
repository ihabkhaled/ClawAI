import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { LiveCaptureConsentDialogProps } from '@/types/live.types';

/**
 * Asked before the browser's share or microphone prompt: what is shared, what is sent, who sees it,
 * what it costs. `copy` carries the tab or microphone wording.
 */
export function LiveCaptureConsentDialog({
  copy,
  open,
  onCancel,
  onConfirm,
  t,
}: LiveCaptureConsentDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <DialogContent className="max-w-lg" data-testid="live-capture-consent">
        <DialogHeader>
          <DialogTitle>{t(copy.consentTitleKey)}</DialogTitle>
          <DialogDescription>{t(copy.consentDescriptionKey)}</DialogDescription>
        </DialogHeader>
        <ul className="text-foreground flex list-disc flex-col gap-2 ps-5 text-sm">
          {copy.consentKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('live.capture.consentCancel')}
          </Button>
          <Button onClick={onConfirm}>{t(copy.consentConfirmKey)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
