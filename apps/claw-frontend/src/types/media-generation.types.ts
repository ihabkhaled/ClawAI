import type { AudioGenerationStatus } from '@/enums/audio-generation-status.enum';
import type { MediaGenerationKind } from '@/enums/media-generation-kind.enum';

/** One generation a chat model made with a media tool, as the assistant message stores it. */
export type MediaGenerationView = {
  kind: MediaGenerationKind;
  id: string;
  prompt: string;
};

/** The stored asset of a finished audio generation. */
export type AudioGenerationAsset = {
  id: string;
  url: string;
  downloadUrl: string;
  mimeType: string;
  sizeBytes: number | null;
};

/** One audio generation row, without the chain head (`latest`). */
export type AudioGenerationRow = {
  id: string;
  status: AudioGenerationStatus;
  provider: string;
  model: string;
  kind: string;
  assetUrl?: string;
  mimeType?: string;
  durationSec?: number;
  errorCode?: string;
  errorMessage?: string;
  supersededById: string | null;
  asset: AudioGenerationAsset | null;
};

/** `GET /audio/:id`: the row asked for plus the head of its retry chain. */
export type AudioGeneration = AudioGenerationRow & {
  latest?: AudioGenerationRow | null;
};

/** `POST /audio/:id/retry` answer: the successor row to follow. */
export type AudioGenerationRetryResult = { id: string; status: AudioGenerationStatus };

export type UseAudioGenerationStateParams = { generationId: string };

export type UseAudioGenerationStateReturn = {
  /** The row to show: the head of the retry chain, or null before the first read. */
  generation: AudioGenerationRow | null;
  isStatusUnknown: boolean;
  handleRetry: () => void;
};

export type AudioGenerationCardProps = { generationId: string; prompt: string };
