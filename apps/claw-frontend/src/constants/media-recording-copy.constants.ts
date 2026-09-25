import { MediaRecordingError } from '@/enums/media-recording-error.enum';
import { MediaRecordingKind } from '@/enums/media-recording-kind.enum';

/**
 * Recorder failure -> translation key. Kept out of the component because a TSX
 * file holds only the component, and out of the hook because the hook must not
 * know about copy: it reports WHAT failed, the UI decides how to say it.
 */
export const MEDIA_RECORDING_ERROR_MESSAGE_KEYS: Readonly<Record<MediaRecordingError, string>> = {
  [MediaRecordingError.Unsupported]: 'chat.recorder.errorUnsupported',
  [MediaRecordingError.PermissionDenied]: 'chat.recorder.errorPermissionDenied',
  [MediaRecordingError.RecorderFailed]: 'chat.recorder.errorRecorderFailed',
  [MediaRecordingError.EmptyRecording]: 'chat.recorder.errorEmptyRecording',
};

/**
 * Why a recorder trigger is dimmed. Dimmed, never hidden — see the component.
 *
 * Neither reason is about the selected chat model (ADR-120 batch 10): audio is
 * always transcribed out of band, so the mic dims only when no transcription
 * provider exists; video is processed for any model, so the camera dims only
 * when the plan's `maxVideoSeconds` is 0.
 */
export const MEDIA_RECORDING_UNSUPPORTED_KEY = 'chat.recorder.unsupportedBrowser';
export const MEDIA_RECORDING_AUDIO_BLOCKED_KEY = 'mediaUi.recorder.noTranscription';
export const MEDIA_RECORDING_VIDEO_BLOCKED_KEY = 'mediaUi.recorder.videoDisabledByPlan';

/**
 * Consent-dialog copy, per recording kind.
 *
 * The dialog is shown BEFORE `getUserMedia`, every time — including when the
 * browser has already granted the permission. It is not a permission shim: it
 * is consent to upload a recording of the user and hand it to a model, and
 * that deserves an explicit yes even when the camera light is cheap to turn on.
 */
export const MEDIA_RECORDING_CONSENT_COPY_KEYS: Readonly<
  Record<MediaRecordingKind, { readonly title: string; readonly devices: string }>
> = {
  [MediaRecordingKind.Audio]: {
    title: 'chat.recorder.consentAudioTitle',
    devices: 'chat.recorder.consentAudioDevices',
  },
  [MediaRecordingKind.Video]: {
    title: 'chat.recorder.consentVideoTitle',
    devices: 'chat.recorder.consentVideoDevices',
  },
};

/** Copy shared by both kinds. */
export const MEDIA_RECORDING_CONSENT_PERMISSION_KEY = 'chat.recorder.consentPermission';
export const MEDIA_RECORDING_CONSENT_UPLOAD_KEY = 'chat.recorder.consentUpload';
export const MEDIA_RECORDING_CONSENT_MAX_LENGTH_KEY = 'chat.recorder.consentMaxLength';
export const MEDIA_RECORDING_CONSENT_CONFIRM_KEY = 'chat.recorder.consentConfirm';
export const MEDIA_RECORDING_CONSENT_CANCEL_KEY = 'chat.recorder.consentCancel';
