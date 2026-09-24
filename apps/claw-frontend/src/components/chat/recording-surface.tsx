import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Send, Square, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { RecordingCameraPreview } from '@/components/chat/recording-camera-preview';
import { RecordingWaveform } from '@/components/chat/recording-waveform';
import { Button } from '@/components/ui/button';
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { MediaRecordingKind } from '@/enums/media-recording-kind.enum';
import { RecordingWaveformVariant } from '@/enums/recording-waveform-variant.enum';
import { useRecordingWaveform } from '@/hooks/files/use-recording-waveform';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { RecordingSurfaceProps } from '@/types';
import { formatRecordingElapsed } from '@/utilities/media-recording.utility';

/**
 * Recording surface, shown as a centered modal (portalled to `document.body`
 * via the house `Dialog`, above the composer and any bottom nav) while
 * `useMediaRecorder.isRecording` is true: a live camera preview (video
 * notes) or a large waveform (voice notes), the elapsed timer, and a rounded
 * pill bar — cancel (X), a compact live waveform, stop (square), send
 * (arrow) — matching a typical voice-message app's recording bar.
 *
 * It used to be a plain `fixed inset-0` `<div>` mounted inline inside the
 * composer's toolbar row. That is exactly the trap `fixed` positioning falls
 * into: an ancestor with a transform (the composer's own entrance/exit
 * animation) turns `fixed` into "relative to that ancestor" instead of the
 * viewport, so on a real phone the timer and waveform got squeezed into the
 * composer's box and collided with the browser chrome and the bottom nav
 * instead of taking over the screen. Radix's `Dialog.Portal` renders into
 * `document.body`, outside every such ancestor, which is why this reuses it
 * rather than hand-rolling another overlay.
 *
 * Backdrop click / Escape both route through `onOpenChange` to `onCancel` —
 * discarding the take is the same "exit" a user expects from any dialog's
 * outside-click, and it goes through the exact same cleanup path as the
 * visible cancel button.
 *
 * Stop and Send both finalize the take through the SAME `onStop`/`onSend`
 * callbacks the caller wires to `useMediaRecorder.stop` — the take is handed
 * to `onRecorded` and attached to the composer either way. Send additionally
 * signals immediate-send intent to the caller (see VoiceVideoRecorder).
 */
export function RecordingSurface({
  kind,
  stream,
  elapsedMs,
  onStop,
  onSend,
  onCancel,
}: RecordingSurfaceProps): ReactElement {
  const { t } = useTranslation();
  const levels = useRecordingWaveform(stream);
  const elapsedLabel = formatRecordingElapsed(elapsedMs);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogPortal>
        <DialogOverlay data-testid="recording-surface-backdrop" />
        <DialogPrimitive.Content
          aria-label={t('chat.recorder.fullScreenLabel')}
          className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-1rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-[calc(100vw-1rem)] max-w-xl min-w-0 -translate-x-1/2 -translate-y-1/2 touch-pan-y flex-col items-center justify-between gap-6 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border p-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg duration-200 sm:max-h-[90dvh] sm:w-full sm:p-6"
          data-testid="recording-surface"
          data-kind={kind}
        >
          <DialogPrimitive.Title className="sr-only">
            {t('chat.recorder.fullScreenLabel')}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {t('chat.recorder.recordingGroupLabel')}
          </DialogPrimitive.Description>
          <span
            className="text-foreground mt-2 text-2xl font-semibold tabular-nums"
            aria-live="polite"
            data-testid="recording-surface-elapsed"
          >
            {t('chat.recorder.recordingElapsed', { time: elapsedLabel })}
          </span>

          <div className="flex w-full flex-1 items-center justify-center">
            {kind === MediaRecordingKind.Video ? (
              <div className="aspect-video max-h-[50vh] w-full">
                <RecordingCameraPreview stream={stream} />
              </div>
            ) : (
              <RecordingWaveform levels={levels} variant={RecordingWaveformVariant.Hero} />
            )}
          </div>

          <div
            className="border-border bg-card flex w-full max-w-md items-center gap-3 rounded-full border p-2 shadow-lg"
            role="group"
            aria-label={t('chat.recorder.recordingGroupLabel')}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 w-11 shrink-0 rounded-full px-0"
              onClick={onCancel}
              aria-label={t('chat.recorder.cancel')}
              title={t('chat.recorder.cancel')}
              data-testid="recording-surface-cancel"
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="flex min-w-0 flex-1 items-center justify-center">
              <RecordingWaveform levels={levels} variant={RecordingWaveformVariant.Compact} />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 w-11 shrink-0 rounded-full px-0"
              onClick={onStop}
              aria-label={t('chat.recorder.stop')}
              title={t('chat.recorder.stop')}
              data-testid="recording-surface-stop"
            >
              <Square className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-11 w-11 shrink-0 rounded-full px-0"
              onClick={onSend}
              aria-label={t('chat.recorder.send')}
              title={t('chat.recorder.send')}
              data-testid="recording-surface-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
