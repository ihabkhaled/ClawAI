import { type VideoAudioStatus, type VideoProcessingFailureReason } from '@claw/shared-types';
import {
  type DerivedTranscriptionStatus,
  type MediaProcessStatus,
  type VideoPlanDecision,
} from '../../../common/enums';
import { type FileIngestionStatus } from '../../../generated/prisma';

// Multimodal batch 7 — video processing types. Type aliases (not interfaces)
// for everything persisted in `extractionMetadata`, because Prisma's JSON input
// type is an index-signature object and only an alias is assignable to it.

/** One bounded ffprobe/ffmpeg invocation. `args` is an ARRAY; there is no shell. */
export type MediaProcessRequest = {
  command: string;
  args: readonly string[];
  timeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
};

export type MediaProcessResult = {
  status: MediaProcessStatus;
  /** Null when the process was killed or never started. */
  exitCode: number | null;
  stdout: Buffer;
  /** Head of stderr only, capped at `maxStderrBytes`. */
  stderr: string;
};

/** A per-job temp dir holding the service-owned copy of the upload. */
export type MediaWorkspace = {
  dir: string;
  inputPath: string;
};

/** What ffprobe said about the container, before any policy is applied. */
export type VideoProbeSummary = {
  hasVideo: boolean;
  /** 0 when ffprobe reported no usable duration. */
  durationMs: number;
  width: number;
  height: number;
  fps: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  hasAudio: boolean;
  container: string | null;
};

export type VideoProbeOutcome =
  | { ok: true; summary: VideoProbeSummary }
  | { ok: false; reason: VideoProcessingFailureReason; detail: string };

/** One transcript line, milliseconds from the start of the clip. */
export type TranscriptSegment = {
  startMs: number;
  endMs: number;
  text: string;
};

/** `extractionMetadata.media` — what the chat UI and the frames endpoint read. */
export type VideoMediaMetadata = {
  durationMs?: number;
  width?: number;
  height?: number;
  fps?: number | null;
  videoCodec?: string | null;
  audioCodec?: string | null;
  hasAudio?: boolean;
  container?: string | null;
  sizeBytes: number;
  thumbnailBase64?: string | null;
  thumbnailMimeType?: string | null;
  transcriptSegments?: TranscriptSegment[];
  audioStatus?: VideoAudioStatus;
  audioReason?: string | null;
  transcriptionProvider?: string | null;
  transcriptionModel?: string | null;
  failureReason?: VideoProcessingFailureReason | null;
  processedAt: string;
};

export type VideoExtractionMetadata = {
  media: VideoMediaMetadata;
};

/** The single write that ends a video job: text, status and metadata together. */
export type VideoExtractionWrite = {
  extractedText: string | null;
  extractionError: string | null;
  status: FileIngestionStatus;
  metadata: VideoExtractionMetadata;
};

export type VideoPlanCheck = {
  decision: VideoPlanDecision;
  /** Null = unlimited (or an admin); only meaningful for ALLOWED / TOO_LONG. */
  limitSeconds: number | null;
};

export type VideoAudioOutcome = {
  status: VideoAudioStatus;
  segments: TranscriptSegment[];
  reason: string | null;
  provider: string | null;
  model: string | null;
};

/** Everything `buildVideoDocument` needs. */
export type VideoDocumentInput = {
  filename: string;
  summary: VideoProbeSummary;
  audio: VideoAudioOutcome;
};

/** How the job ended, before the single write. */
export type VideoAnalysis =
  | { ok: true; summary: VideoProbeSummary; thumbnail: Buffer | null; audio: VideoAudioOutcome }
  | {
      ok: false;
      reason: VideoProcessingFailureReason;
      message: string;
      summary: VideoProbeSummary | null;
      thumbnail: Buffer | null;
    };

/** A derived audio buffer (a video's track) handed to the transcription path. */
export type DerivedAudioTranscriptionInput = {
  /** The PARENT file id — the video row. The meter charges its uploader. */
  fileId: string;
  userId: string;
  audioBase64: string;
  mimeType: string;
  sizeBytes: number;
  /** Measured by ffprobe, so the hold is sized on real seconds, not bytes. */
  audioSeconds: number;
  /** Inserted into the PAYG request id so it never collides with an audio upload. */
  requestScope: string;
  instruction: string;
};

export type DerivedAudioTranscriptionOutcome =
  | {
      status: DerivedTranscriptionStatus.TRANSCRIBED;
      text: string;
      segments: TranscriptSegment[];
      provider: string;
      model: string;
    }
  | { status: DerivedTranscriptionStatus.FAILED; reason: string };

/** One on-demand frame returned by the internal frames endpoint. */
export type VideoFrame = {
  timestampMs: number;
  mimeType: string;
  base64: string;
};

/** What a failure message may mention. Every field is optional context. */
export type VideoFailureDetail = {
  summary?: VideoProbeSummary | null;
  limitSeconds?: number | null;
  message?: string;
};

/** A transcript start parsed from one `[mm:ss]` line, before its end is known. */
export type TranscriptLineStart = {
  startMs: number;
  text: string;
};
