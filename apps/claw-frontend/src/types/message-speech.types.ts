import type { SpeechUnavailableReason } from '@claw/shared-types';

import type { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import type { TranslateFunction } from '@/types/i18n.types';

/** `GET /chat-messages/speech/availability` — one answer for the whole page. */
export type SpeechAvailability = {
  available: boolean;
  reason: SpeechUnavailableReason | null;
};

/**
 * `POST /chat-messages/:messageId/speech`. The audio is an ordinary
 * user-owned file: it is fetched through the authenticated download path,
 * never a public URL. `cached` means the backend replayed an earlier synthesis
 * for free.
 */
export type SynthesizedSpeech = {
  fileId: string;
  mimeType: string;
  filename: string;
  truncated: boolean;
  characters: number;
  cached: boolean;
};

/** Inputs for deciding what the read-aloud button currently is. */
export type MessageSpeechStatusInput = {
  isPending: boolean;
  isOpen: boolean;
  isSuccess: boolean;
  isError: boolean;
};

export type MessageSpeechActionProps = {
  messageId: string;
};

export type MessageSpeechPlayerProps = {
  messageId: string;
};

export type MessageSpeechAudioProps = {
  fileId: string;
  filename: string;
  mimeType: string;
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

export type UseMessageSpeechPlayerReturn = {
  t: TranslateFunction;
  isOpen: boolean;
  isLoading: boolean;
  speech: SynthesizedSpeech | null;
  errorKey: string | null;
};

export type UseMessageSpeechAudioReturn = {
  t: TranslateFunction;
  blobUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
  download: () => void;
};

/** The latest synthesize mutation for one message, as useMutationState sees it. */
export type MessageSpeechMutationSnapshot = {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: unknown;
  error: unknown;
};
