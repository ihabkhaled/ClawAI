import { MediaRecordingError } from '@/enums/media-recording-error.enum';

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

/** Why a recorder trigger is dimmed. Dimmed, never hidden — see the component. */
export const MEDIA_RECORDING_UNSUPPORTED_KEY = 'chat.recorder.unsupportedBrowser';
export const MEDIA_RECORDING_AUDIO_BLOCKED_KEY = 'chat.recorder.audioNotSupportedByModel';
export const MEDIA_RECORDING_VIDEO_BLOCKED_KEY = 'chat.recorder.videoNotSupportedByModel';
