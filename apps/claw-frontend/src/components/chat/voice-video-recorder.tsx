'use client';

import { Mic, Video } from 'lucide-react';

import { MediaRecordingConsentDialog } from '@/components/chat/media-recording-consent-dialog';
import { RecordingSurface } from '@/components/chat/recording-surface';
import { Button } from '@/components/ui/button';
import {
  MEDIA_RECORDING_AUDIO_BLOCKED_KEY,
  MEDIA_RECORDING_ERROR_MESSAGE_KEYS,
  MEDIA_RECORDING_VIDEO_BLOCKED_KEY,
} from '@/constants/media-recording-copy.constants';
import { MediaRecordingKind } from '@/enums/media-recording-kind.enum';
import { useMediaRecorder } from '@/hooks/files/use-media-recorder';
import { useMediaRecordingConsent } from '@/hooks/files/use-media-recording-consent';
import { useTranslation } from '@/lib/i18n/use-translation';
import { cn } from '@/lib/utils';
import type { VoiceVideoRecorderProps } from '@/types';
import { resolveRecorderBlockedKey } from '@/utilities/media-recording.utility';

/**
 * Microphone and camera buttons for the composer.
 *
 * A capability the model does not have DIMS its button, it does not remove it.
 * A control that vanishes teaches the user nothing — they are left wondering
 * whether the feature exists at all. A dimmed control with a title that says
 * "this model cannot read audio" tells them exactly what to change.
 *
 * While recording, the two triggers are replaced by the live readout plus stop
 * and discard, so there is never a second recording competing for the device.
 *
 * Pressing a trigger does NOT touch the device: it opens a consent dialog, and
 * `getUserMedia` — and therefore the browser's own permission prompt — happens
 * only after the user confirms there. See `useMediaRecordingConsent`.
 */
export function VoiceVideoRecorder({
  canSendAudio,
  canSendVideo,
  onRecorded,
  disabled,
}: VoiceVideoRecorderProps): React.ReactElement {
  const { t } = useTranslation();
  const { isRecording, isSupported, start, stop, cancel, elapsedMs, error, stream, activeKind } =
    useMediaRecorder({ onRecorded });
  const consent = useMediaRecordingConsent({ start });

  const audioBlockedKey = resolveRecorderBlockedKey(
    isSupported,
    canSendAudio,
    MEDIA_RECORDING_AUDIO_BLOCKED_KEY,
  );
  const videoBlockedKey = resolveRecorderBlockedKey(
    isSupported,
    canSendVideo,
    MEDIA_RECORDING_VIDEO_BLOCKED_KEY,
  );

  const audioLabel = t(audioBlockedKey ?? 'chat.recorder.recordVoice');
  const videoLabel = t(videoBlockedKey ?? 'chat.recorder.recordVideo');

  if (isRecording && activeKind !== null) {
    return (
      <RecordingSurface
        kind={activeKind}
        stream={stream}
        elapsedMs={elapsedMs}
        onStop={stop}
        onSend={stop}
        onCancel={cancel}
      />
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5" data-testid="voice-video-recorder">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          'border-border/60 h-9 w-9 shrink-0 justify-center rounded-xl px-0',
          audioBlockedKey === null ? null : 'opacity-50',
        )}
        disabled={disabled === true || audioBlockedKey !== null}
        onClick={() => consent.request(MediaRecordingKind.Audio)}
        aria-label={audioLabel}
        title={audioLabel}
        data-testid="voice-video-recorder-audio"
      >
        <Mic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          'border-border/60 h-9 w-9 shrink-0 justify-center rounded-xl px-0',
          videoBlockedKey === null ? null : 'opacity-50',
        )}
        disabled={disabled === true || videoBlockedKey !== null}
        onClick={() => consent.request(MediaRecordingKind.Video)}
        aria-label={videoLabel}
        title={videoLabel}
        data-testid="voice-video-recorder-video"
      >
        <Video className="h-4 w-4" />
      </Button>
      {error === null ? null : (
        <span
          className="text-destructive text-xs"
          role="status"
          data-testid="voice-video-recorder-error"
        >
          {t(MEDIA_RECORDING_ERROR_MESSAGE_KEYS[error])}
        </span>
      )}
      <MediaRecordingConsentDialog
        kind={consent.pendingKind}
        onOpenChange={consent.setOpen}
        onConfirm={consent.confirm}
        onCancel={consent.cancel}
        confirmRef={consent.confirmRef}
        onOpenAutoFocus={consent.focusConfirmOnOpen}
      />
    </div>
  );
}
