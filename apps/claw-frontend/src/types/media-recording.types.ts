import type { MediaRecordingError } from '@/enums/media-recording-error.enum';
import type { MediaRecordingKind } from '@/enums/media-recording-kind.enum';

// media-recording.types.ts — exported shapes only, no runtime code.

export type UseMediaRecorderParams = {
  /**
   * Called once per completed recording with a real `File`, ready to hand to
   * `useComposerAttachments.ingestFiles`. Never called for a cancelled take.
   */
  onRecorded: (file: File) => void;
};

export type UseMediaRecorderReturn = {
  isRecording: boolean;
  /** False during SSR and in any browser without MediaRecorder/getUserMedia. */
  isSupported: boolean;
  start: (kind: MediaRecordingKind) => Promise<void>;
  /** Keep what was captured and emit it through `onRecorded`. */
  stop: () => void;
  /** Throw the take away. Tracks are released exactly as on stop. */
  cancel: () => void;
  elapsedMs: number;
  error: MediaRecordingError | null;
};

/**
 * What the currently selected model can be handed. Both default to TRUE when
 * the model is unknown — see useModelMediaCapabilities.
 */
export type ModelMediaCapabilities = {
  canSendAudio: boolean;
  canSendVideo: boolean;
};

export type VoiceVideoRecorderProps = ModelMediaCapabilities & {
  onRecorded: (file: File) => void;
  /** Composer-level disable (a send in flight), independent of capability. */
  disabled?: boolean;
};
