import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LIVE_CAPTURE_CONSENT_KEYS } from '@/constants/live.constants';
import type { LiveCaptureConsentDialogProps } from '@/types/live.types';

/** Asked before the browser's share prompt: what is shared, what is sent, who sees it, what it costs. */
export function LiveCaptureConsentDialog({
  open,
  onCancel,
  onConfirm,
  t,
}: LiveCaptureConsentDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
      <DialogContent className="max-w-lg" data-testid="live-capture-consent">
        <DialogHeader>
          <DialogTitle>{t('live.capture.consentTitle')}</DialogTitle>
          <DialogDescription>{t('live.capture.consentDescription')}</DialogDescription>
        </DialogHeader>
        <ul className="text-foreground flex list-disc flex-col gap-2 ps-5 text-sm">
          {LIVE_CAPTURE_CONSENT_KEYS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('live.capture.consentCancel')}
          </Button>
          <Button onClick={onConfirm}>{t('live.capture.consentConfirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
