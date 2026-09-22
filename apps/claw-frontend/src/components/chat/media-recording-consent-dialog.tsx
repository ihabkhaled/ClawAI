'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MEDIA_RECORDING_CONSENT_CANCEL_KEY,
  MEDIA_RECORDING_CONSENT_CONFIRM_KEY,
  MEDIA_RECORDING_CONSENT_COPY_KEYS,
  MEDIA_RECORDING_CONSENT_MAX_LENGTH_KEY,
  MEDIA_RECORDING_CONSENT_PERMISSION_KEY,
  MEDIA_RECORDING_CONSENT_UPLOAD_KEY,
} from '@/constants/media-recording-copy.constants';
import { MediaRecordingKind } from '@/enums/media-recording-kind.enum';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { MediaRecordingConsentDialogProps } from '@/types';
import { resolveRecordingMaxMinutes } from '@/utilities/media-recording.utility';

/**
 * The confirmation shown BEFORE the browser's microphone/camera prompt.
 *
 * It names the device that is about to turn on, warns that the browser will
 * ask next, states that the recording is uploaded and sent to the AI model as
 * an attachment, and gives the length cap. The upload sentence is the one
 * users genuinely cannot guess, and the reason this dialog exists even when
 * the permission was granted long ago.
 */
export function MediaRecordingConsentDialog({
  kind,
  onOpenChange,
  onConfirm,
  onCancel,
  confirmRef,
  onOpenAutoFocus,
}: MediaRecordingConsentDialogProps): ReactElement | null {
  const { t } = useTranslation();

  if (kind === null) {
    return null;
  }

  const copy = MEDIA_RECORDING_CONSENT_COPY_KEYS[kind];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={onOpenAutoFocus}
        data-testid="media-recording-consent-dialog"
        data-kind={kind === MediaRecordingKind.Video ? 'video' : 'audio'}
      >
        <DialogHeader>
          <DialogTitle>{t(copy.title)}</DialogTitle>
          <DialogDescription data-testid="media-recording-consent-devices">
            {t(copy.devices)}
          </DialogDescription>
        </DialogHeader>

        <ul className="text-muted-foreground list-disc space-y-2 ps-5 text-sm">
          <li data-testid="media-recording-consent-permission">
            {t(MEDIA_RECORDING_CONSENT_PERMISSION_KEY)}
          </li>
          <li data-testid="media-recording-consent-upload">
            {t(MEDIA_RECORDING_CONSENT_UPLOAD_KEY)}
          </li>
          <li data-testid="media-recording-consent-max-length">
            {t(MEDIA_RECORDING_CONSENT_MAX_LENGTH_KEY, { minutes: resolveRecordingMaxMinutes() })}
          </li>
        </ul>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="media-recording-consent-cancel"
          >
            {t(MEDIA_RECORDING_CONSENT_CANCEL_KEY)}
          </Button>
          <Button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            data-testid="media-recording-consent-confirm"
          >
            {t(MEDIA_RECORDING_CONSENT_CONFIRM_KEY)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
