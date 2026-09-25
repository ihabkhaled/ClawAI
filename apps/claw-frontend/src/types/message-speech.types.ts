import type { SpeechUnavailableReason } from '@claw/shared-types';
import type { RefObject } from 'react';

import type { MessageSpeechJobStatus } from '@/enums/message-speech-job-status.enum';
import type { MessageSpeechPlaybackPhase } from '@/enums/message-speech-playback-phase.enum';
import type { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import type { TranslateFunction } from '@/types/i18n.types';

/** `GET /chat-messages/speech/availability` — one answer for the whole page. */
export type SpeechAvailability = {
  available: boolean;
  reason: SpeechUnavailableReason | null;
};

/** One synthesised part of a reply: an ordinary user-owned audio file. */
export type MessageSpeechSegment = {
  /** 0-based playback position. */
  index: number;
  fileId: string;
  mimeType: string;
  characters: number;
};

/**
 * `POST` / `GET /chat-messages/:messageId/speech`. Segments arrive in index
 * order while the job is GENERATING; a PARTIAL reading plays what exists.
 */
export type MessageSpeechState = {
  status: MessageSpeechJobStatus;
  segments: MessageSpeechSegment[];
  totalSegments: number;
  truncated: boolean;
  errorCode: string | null;
};

/** Inputs for deciding what the read-aloud button currently is. */
export type MessageSpeechStatusInput = {
  isPending: boolean;
  isOpen: boolean;
  isError: boolean;
  state: MessageSpeechState | undefined;
};

/** Inputs for deciding what the player is doing. */
export type MessageSpeechPhaseInput = {
  state: MessageSpeechState | undefined;
  currentIndex: number;
  hasCurrentAudio: boolean;
  isPaused: boolean;
  isFinished: boolean;
  hasPlaybackError: boolean;
  isPollingExpired: boolean;
};

export type MessageSpeechActionProps = {
  messageId: string;
};

export type MessageSpeechPlayerProps = {
  messageId: string;
};

export type UseMessageSpeechAvailabilityReturn = {
  /** Null while unknown (loading, or the check itself failed). */
  availability: SpeechAvailability | null;
  isLoading: boolean;
};

export type UseMessageSpeechOpenFlagReturn = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

export type UseMessageSpeechStateReturn = {
  state: MessageSpeechState | undefined;
  /** True once the poll cap is reached while the job still says GENERATING. */
  isPollingExpired: boolean;
};

export type UseMessageSpeechReturn = {
  t: TranslateFunction;
  status: MessageSpeechStatus;
  /** True when the backend said read aloud cannot run: the button is dimmed, not hidden. */
  isUnavailable: boolean;
  /** The localized button label — the unavailable reason when dimmed. */
  label: string;
  isPlayerOpen: boolean;
  /** i18n key of the last request's error, or null. */
  errorKey: string | null;
  /** Start, stop, or retry, depending on the current status. */
  toggle: () => void;
};

export type UseSpeechSegmentBlobsReturn = {
  /** Object URLs by segment index, for the current and the next segment only. */
  urls: Readonly<Partial<Record<number, string>>>;
  /** True when the current segment's audio could not be fetched. */
  hasError: boolean;
};

export type UseMessageSpeechPlayerReturn = {
  t: TranslateFunction;
  phase: MessageSpeechPlaybackPhase;
  /** The localized aria-live status line. */
  statusText: string;
  audioRef: RefObject<HTMLAudioElement | null>;
  /** The object URL of the segment being played, or null while it is not here yet. */
  currentUrl: string | null;
  isPaused: boolean;
  /** Play/pause is meaningful only once a segment is loaded. */
  canTogglePause: boolean;
  togglePause: () => void;
  stop: () => void;
  onEnded: () => void;
  onPlay: () => void;
  onPause: () => void;
  onAudioError: () => void;
  /** Waiting for audio (the first part, or the next one): spinner + aria-busy. */
  isBusy: boolean;
  isTruncated: boolean;
  isPartial: boolean;
  /** i18n key of the failure to show, or null. */
  errorKey: string | null;
};

/** The latest start mutation for one message, as useMutationState sees it. */
export type MessageSpeechMutationSnapshot = {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: unknown;
  error: unknown;
};

/** What can have gone wrong for the player, most specific first. */
export type MessageSpeechPlayerErrorInput = {
  /** The start request's error, or null. */
  startError: unknown;
  state: MessageSpeechState | undefined;
  isPollingExpired: boolean;
  hasPlaybackError: boolean;
};

/** How a component observes the job's state: the player polls, the button only reads. */
export type UseMessageSpeechStateOptions = {
  /** Fetch at all (the player is open and a reading was started or is cached). */
  enabled: boolean;
  /** Poll while GENERATING. Exactly one observer per reply polls, so there is one timer. */
  poll: boolean;
};
