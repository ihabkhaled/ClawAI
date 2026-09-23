import { Send, Square, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { RecordingCameraPreview } from '@/components/chat/recording-camera-preview';
import { RecordingWaveform } from '@/components/chat/recording-waveform';
import { Button } from '@/components/ui/button';
import { MediaRecordingKind } from '@/enums/media-recording-kind.enum';
import { RecordingWaveformVariant } from '@/enums/recording-waveform-variant.enum';
import { useRecordingWaveform } from '@/hooks/files/use-recording-waveform';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { RecordingSurfaceProps } from '@/types';
import { formatRecordingElapsed } from '@/utilities/media-recording.utility';

/**
 * Full-screen recording surface, shown while `useMediaRecorder.isRecording`
 * is true: a live camera preview (video notes) or a large waveform (voice
 * notes), the elapsed timer, and a rounded pill bar — cancel (X), a compact
 * live waveform, stop (square), send (arrow) — matching a typical
 * voice-message app's recording bar.
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('chat.recorder.fullScreenLabel')}
      className="bg-background/98 fixed inset-0 z-50 flex flex-col items-center justify-between gap-6 p-6 backdrop-blur-sm"
      data-testid="recording-surface"
      data-kind={kind}
    >
      <span
        className="text-foreground mt-8 text-2xl font-semibold tabular-nums"
        aria-live="polite"
        data-testid="recording-surface-elapsed"
      >
        {t('chat.recorder.recordingElapsed', { time: elapsedLabel })}
      </span>

      <div className="flex w-full max-w-xl flex-1 items-center justify-center">
        {kind === MediaRecordingKind.Video ? (
          <div className="aspect-video max-h-[60vh] w-full">
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
    </div>
  );
}
