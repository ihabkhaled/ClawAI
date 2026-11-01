import { AudioGenerationStatus } from '@/enums/audio-generation-status.enum';

/** image-service has no event stream for audio: the card polls `GET /audio/:id` this often. */
export const AUDIO_GENERATION_POLL_INTERVAL_MS = 2000;

/** Hard cap on polls per card: 150 x 2 s = 5 minutes, never infinite. */
export const AUDIO_GENERATION_MAX_POLLS = 150;

/** Consecutive failed reads after which the card stops polling. */
export const AUDIO_GENERATION_MAX_CONSECUTIVE_ERRORS = 5;

/** Filename offered by the completed card's Download link, by mime type. */
export const AUDIO_DOWNLOAD_FILENAME_BY_MIME: ReadonlyMap<string, string> = new Map([
  ['audio/mpeg', 'claw-audio.mp3'],
  ['audio/mp3', 'claw-audio.mp3'],
  ['audio/wav', 'claw-audio.wav'],
  ['audio/x-wav', 'claw-audio.wav'],
  ['audio/ogg', 'claw-audio.ogg'],
  ['audio/flac', 'claw-audio.flac'],
]);

export const AUDIO_DOWNLOAD_FILENAME_FALLBACK = 'claw-audio';

/** The audio card's status line per status. Exhaustive: a new status without copy fails typecheck. */
export const AUDIO_STATUS_LABEL_KEYS: Readonly<Record<AudioGenerationStatus, string>> = {
  [AudioGenerationStatus.QUEUED]: 'mediaUi.audio.queued',
  [AudioGenerationStatus.RUNNING]: 'mediaUi.audio.running',
  [AudioGenerationStatus.COMPLETED]: 'mediaUi.audio.label',
  [AudioGenerationStatus.FAILED]: 'mediaUi.audio.failed',
  [AudioGenerationStatus.TIMED_OUT]: 'mediaUi.audio.timedOut',
  [AudioGenerationStatus.CANCELLED]: 'chat.generationCancelled',
};

/** No generation row yet (the card renders before the first poll answers). */
export const AUDIO_STATUS_PREPARING_KEY = 'mediaUi.audio.preparing';
