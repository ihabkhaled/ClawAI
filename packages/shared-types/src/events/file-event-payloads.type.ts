/** File-service event payloads (split from event-payloads.type.ts to keep it under the size budget). */
import {
  type FileIngestionStatus,
  type VideoAudioStatus,
  type VideoProcessingFailureReason,
} from '../enums';
import type { BaseEventPayload } from './event-payloads.type';

// ---- File Events ----

export interface FileUploadedPayload extends BaseEventPayload {
  fileId: string;
  threadId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface FileChunkedPayload extends BaseEventPayload {
  fileId: string;
  chunkCount: number;
  status: FileIngestionStatus;
}

export type FileFailureStage = 'EXTRACTION' | 'CHUNKING' | 'UPLOAD' | 'OTHER';

export interface FileFailedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  filename: string;
  errorMessage: string;
  failureStage: FileFailureStage;
}

export interface FileRetentionExpiredPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  filename: string;
  retentionExpiresAt: string;
  sizeBytes: number;
}

export interface FileArchiveExpandedPayload extends BaseEventPayload {
  parentFileId: string;
  userId: string;
  parentFilename: string;
  childFileCount: number;
  totalExtractedBytes: number;
}

// ---- Slice D — File lifecycle + OCR events ----

export type FileExtractionFailureStage = 'PARSE' | 'CHUNK' | 'OCR';
export type FileDownloadMethod = 'BROWSER' | 'INTERNAL_API';
export type FileDeletionReason = 'USER' | 'RETENTION' | 'ADMIN';
export type FileOcrFailureStage = 'WORKER_INIT' | 'PROCESSING' | 'TIMEOUT';

export interface FileUploadStartedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Emitted when the upload + ingestion pipeline finishes successfully. Shape
 * mirrors the legacy {@link FileUploadedPayload} so existing consumers can be
 * migrated without code changes; once the deprecated FILE_UPLOADED pattern is
 * retired this type may diverge.
 */
export type FileUploadCompletedPayload = FileUploadedPayload;

export interface FileExtractionFailedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  filename: string;
  errorMessage: string;
  failureStage: FileExtractionFailureStage;
}

export interface FileDownloadedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  downloadedBy: string;
  downloadMethod: FileDownloadMethod;
}

export interface FileDeletedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  filename: string;
  deletedBy: string;
  reason: FileDeletionReason;
}

export interface FileOcrStartedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  mimeType: string;
  isImageFile: boolean;
  isScannedPdf: boolean;
}

export interface FileOcrCompletedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  extractedTextLength: number;
  confidence: number;
  durationMs: number;
}

export interface FileOcrFailedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  errorMessage: string;
  failureStage: FileOcrFailureStage;
}

// ---- B6b — audio transcription (file-service, RabbitMQ job) ----

/**
 * Why the transcription of an audio upload did not produce a transcript.
 *
 * `NO_CAPABLE_CONNECTOR` is deliberately its own class rather than folded into
 * `PROVIDER_ERROR`: it is not a fault, it is a configuration answer, and the
 * agreed rule is that it becomes a clear refusal the user can read instead of a
 * silent success with a placeholder that looks like content.
 */
export type FileTranscribeFailureReasonCode =
  | 'NO_CAPABLE_CONNECTOR'
  | 'PROVIDER_ERROR'
  | 'EMPTY_TRANSCRIPT'
  | 'FILE_NOT_FOUND'
  | 'AUDIO_UNREADABLE'
  /** Longer than `MAX_TRANSCRIBABLE_AUDIO_BYTES` — a cost ceiling, not a storage one. */
  | 'AUDIO_TOO_LARGE'
  /** The uploader's PAYG credit cannot cover the transcription (402, or a clamped hold). */
  | 'INSUFFICIENT_CREDIT'
  /** The credit check itself could not run (meter unreachable, model unpriced). Fails closed. */
  | 'CREDIT_CHECK_UNAVAILABLE';

/** The job. Carries only identifiers — the bytes are read from the row. */
export interface FileTranscribeRequestedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  filename: string;
  mimeType: string;
}

export interface FileTranscribeCompletedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  provider: string;
  model: string;
  /** Length of the transcript actually written to `files.extracted_text`. */
  characters: number;
  durationMs: number;
}

export interface FileTranscribeFailedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  /** Human-readable; this is also what lands in `files.extraction_error`. */
  reason: string;
  reasonCode: FileTranscribeFailureReasonCode;
  /** Absent when the failure happened before a provider was chosen. */
  provider?: string;
  model?: string;
}

// ---- Multimodal batch 7 — video processing (file-service, RabbitMQ job) ----

/** The job. Carries only identifiers — the bytes are read from the row. */
export interface FileVideoProcessRequestedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  filename: string;
  mimeType: string;
}

/** The timestamped document landed on the row. No transcript text on the wire. */
export interface FileVideoProcessCompletedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  durationMs: number;
  hasAudio: boolean;
  audioStatus: VideoAudioStatus;
  transcriptSegmentCount: number;
  /** Wall-clock time the job took, probe through write. */
  processingMs: number;
}

export interface FileVideoProcessFailedPayload extends BaseEventPayload {
  fileId: string;
  userId: string;
  reasonCode: VideoProcessingFailureReason;
  /** Human-readable; this is also what lands in `files.extraction_error`. */
  reason: string;
}

// ---- Image generation (image-service) ----

/**
 * `image.failed`. `supersededById` is present only when AUTO mode already
 * created and linked a fallback successor for this generation (it is created
 * BEFORE the failure is published), so a consumer can tell "this attempt
 * failed, generation continues as <id>" from a terminal failure. Optional:
 * a consumer built before the field existed is unaffected.
 */
export interface ImageFailedPayload extends BaseEventPayload {
  generationId: string;
  userId: string;
  provider: string;
  model: string;
  prompt: string;
  errorCode: string;
  errorMessage: string;
  supersededById?: string;
}
