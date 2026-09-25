import { VIDEO_MIME_PREFIX } from '../../../common/constants/execution.constants';
import { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';
import { MediaCapabilityState } from '../../../common/enums/media-capability-state.enum';
import { VideoFrameDelivery } from '../../../common/enums/video-frame-delivery.enum';
import {
  BASE64_DECODED_BYTES_PER_CHAR,
  DELIVERY_REASON_FAILED_PROCESSING,
  DELIVERY_REASON_NATIVE_AUDIO_TRANSCRIPT_FAILED,
  DELIVERY_REASON_NATIVE_AUDIO_TRANSCRIPT_PENDING,
  DELIVERY_REASON_NO_IMAGE_BYTES,
  DELIVERY_REASON_NO_VIDEO_INPUT,
  DELIVERY_REASON_NO_VISION,
  DELIVERY_REASON_STILL_PROCESSING,
  DELIVERY_REASON_TRUNCATED,
  DELIVERY_REASON_UNSUPPORTED_MIME,
  DELIVERY_REASON_VIDEO_PLAN_LIMIT,
  DELIVERY_REASON_VIDEO_PROCESSING_CANCELLED,
} from '../constants/attachment-delivery.constants';
import { NATIVE_VIDEO_MAX_DURATION_MS } from '../constants/video-delivery.constants';
import { TEXT_BUDGET_SHORTENED_MARKER } from '../constants/evidence-fit.constants';
import { MAX_FILE_CONTENT_LENGTH } from '../constants/file-content.constants';
import { NATIVE_AUDIO_MAX_BYTES } from '../constants/native-audio.constants';
import {
  EXTRACTABLE_DOCUMENT_MIME_EXACT,
  IMAGE_MIME_PREFIX,
  TEXT_LIKE_MIME_EXACT,
  TEXT_LIKE_MIME_PREFIXES,
  VISION_CAPABLE_PROVIDERS,
} from '../constants/file-delivery.constants';
import {
  AUDIO_MIME_PREFIX,
  IMAGE_FILE_PLACEHOLDER_PREFIX,
} from '../constants/media-placeholder.constants';
import { AUDIO_TRANSCRIPTION_PLACEHOLDER_PREFIX } from '../constants/voice-note.constants';
import { SECOND_MS } from '../constants/video-timestamp.constants';
import type {
  AttachmentDeliveryDecision,
  AttachmentDeliveryOptions,
  VideoPlanGate,
} from '../types/attachment-delivery.types';
import type { AssembledContext, FileContentResponse } from '../types/context.types';
import type { FileDeliveryEntry } from '../types/file-delivery.types';
import type { ModelMediaCapabilities } from '../types/model-capability.types';
import type { VideoFrameImage } from '../types/video-delivery.types';
import { decodedAudioBytes, estimateNativeAudioTokens } from './native-audio.utility';
import {
  hasVideoDocument,
  isVideoPlanRefusal,
  isVideoProcessingCancelled,
  videoInFlight,
  videoProcessingFailed,
} from './video-context.utility';

/**
 * How each attachment reaches ONE lane — the single classifier behind both the
 * provider payload and the `FileDeliveryMode` record (ADR-120).
 *
 *   audio → NATIVE_AUDIO when the lane's transport carries audio, its model's
 *           catalog row says audio input SUPPORTED and the recording fits the
 *           size cap and the window (bytes + transcript, rule 42 item 22);
 *           else TRANSCRIPT / STILL_PROCESSING / FAILED_PROCESSING (no bytes)
 *   video → NATIVE_VIDEO when the lane really sends it, else
 *           VIDEO_FRAMES_AND_TRANSCRIPT / STILL_PROCESSING / FAILED_PROCESSING
 *   image → NATIVE_IMAGE when the model can see, else OMITTED_NO_VISION (no
 *           bytes; the OCR text and an honest note instead). Batch 5's helper
 *           vision upgrades exactly this OMITTED_NO_VISION decision.
 *   text  → EXTRACTED_TEXT / TRUNCATED_TEXT / STILL_PROCESSING / FAILED_PROCESSING
 *   other → OMITTED_UNSUPPORTED
 *
 * Vision UNKNOWN (catalog down, or a cloud model it has no row for) falls back
 * to the provider-level `VISION_CAPABLE_PROVIDERS` list — the behaviour that
 * shipped before per-model capability existed — so an outage never strips a
 * working image flow.
 */
export function resolveAttachmentDelivery(
  files: readonly FileContentResponse[],
  capabilities: ModelMediaCapabilities,
  options: AttachmentDeliveryOptions,
): AttachmentDeliveryDecision[] {
  return files.map((file) => resolveOne(file, capabilities, options));
}

/** Whether a lane's model can see images, with the documented UNKNOWN fallback. */
export function laneSupportsVision(provider: string, vision: MediaCapabilityState): boolean {
  return vision !== MediaCapabilityState.UNKNOWN
    ? vision === MediaCapabilityState.SUPPORTED
    : VISION_CAPABLE_PROVIDERS.has(provider) ||
        VISION_CAPABLE_PROVIDERS.has(provider.toUpperCase());
}

/** The provenance entries, without the payload-only `sendNative` flag. */
export function deliveryEntriesOf(
  decisions: readonly AttachmentDeliveryDecision[],
): FileDeliveryEntry[] {
  return decisions.map(({ sendNative: _sendNative, ...entry }) => entry);
}

/** Counts per mode, for the per-turn `mediaDelivery` log line. */
export function countDeliveryModes(
  decisions: readonly { mode: FileDeliveryMode }[],
): Partial<Record<FileDeliveryMode, number>> {
  const counts: Partial<Record<FileDeliveryMode, number>> = {};
  for (const decision of decisions) {
    counts[decision.mode] = (counts[decision.mode] ?? 0) + 1;
  }
  return counts;
}

function resolveOne(
  file: FileContentResponse,
  capabilities: ModelMediaCapabilities,
  options: AttachmentDeliveryOptions,
): AttachmentDeliveryDecision {
  const mime = (file.mimeType ?? '').toLowerCase();
  if (mime.startsWith(AUDIO_MIME_PREFIX)) {
    return resolveAudio(file, capabilities, options);
  }
  if (mime.startsWith(VIDEO_MIME_PREFIX)) {
    return resolveVideo(file, capabilities, options);
  }
  if (mime.startsWith(IMAGE_MIME_PREFIX)) {
    return resolveImage(file, capabilities, options);
  }
  return isTextLikeMime(mime) || EXTRACTABLE_DOCUMENT_MIME_EXACT.has(mime)
    ? decide(file, options, resolveTextMode(file), false)
    : decide(file, options, FileDeliveryMode.OMITTED_UNSUPPORTED, false);
}

function resolveAudioMode(file: FileContentResponse): FileDeliveryMode {
  const text = file.extractedText?.trim() ?? '';
  if (text.length > 0 && !text.startsWith(AUDIO_TRANSCRIPTION_PLACEHOLDER_PREFIX)) {
    return FileDeliveryMode.TRANSCRIPT;
  }
  const failed =
    (file.extractionError !== null && file.extractionError !== undefined) ||
    file.ingestionStatus === 'FAILED';
  return failed ? FileDeliveryMode.FAILED_PROCESSING : FileDeliveryMode.STILL_PROCESSING;
}

/**
 * Audio, per lane (rule 42 item 22). Native only when ALL hold:
 *   - the transport carries audio bytes (Gemini's native request);
 *   - the catalog says the model accepts audio input — SUPPORTED, never
 *     UNKNOWN (an outage keeps the transcript path that always worked);
 *   - the bytes are here, within `NATIVE_AUDIO_MAX_BYTES`;
 *   - the estimated audio tokens fit the lane's audio slice of the file share.
 * A native recording keeps its transcript beside it (HYBRID). A transcript
 * still processing or failed does not block the audio — the recording is then
 * the only source of the words, and the reason says so.
 */
function resolveAudio(
  file: FileContentResponse,
  capabilities: ModelMediaCapabilities,
  options: AttachmentDeliveryOptions,
): AttachmentDeliveryDecision {
  const transcriptMode = resolveAudioMode(file);
  const budget = options.nativeAudioTokenBudget;
  const native =
    options.nativeAudioTransport === true &&
    capabilities.audioInput === MediaCapabilityState.SUPPORTED &&
    hasBytes(file) &&
    decodedAudioBytes(file) <= NATIVE_AUDIO_MAX_BYTES &&
    (budget === undefined || estimateNativeAudioTokens(file) <= budget);
  return native
    ? decide(file, options, FileDeliveryMode.NATIVE_AUDIO, true, nativeAudioReason(transcriptMode))
    : decide(file, options, transcriptMode, false);
}

/** Why a native recording carried the words alone: transcript pending or failed. */
function nativeAudioReason(transcriptMode: FileDeliveryMode): string | undefined {
  if (transcriptMode === FileDeliveryMode.STILL_PROCESSING) {
    return DELIVERY_REASON_NATIVE_AUDIO_TRANSCRIPT_PENDING;
  }
  return transcriptMode === FileDeliveryMode.FAILED_PROCESSING
    ? DELIVERY_REASON_NATIVE_AUDIO_TRANSCRIPT_FAILED
    : undefined;
}

/**
 * Video, per lane (multimodal batch 8):
 *
 *   1. NATIVE_VIDEO — the lane's transport carries video bytes, the model
 *      accepts video (or the catalog cannot say), the bytes are here, AND
 *      file-service has finished with the video: its duration is MEASURED
 *      (`media.durationMs`), inside the provider limit and inside the
 *      uploader's plan `maxVideoSeconds` as read for this turn (null
 *      unlimited, 0 disabled). A video still processing, one with no measured
 *      duration, or a turn whose plan could not be read never rides natively —
 *      a plan limit is never bypassed by picking a model that watches video
 *      (ADR-122; fails closed).
 *   2. VIDEO_FRAMES_AND_TRANSCRIPT — file-service's timestamped document
 *      exists; `VideoDeliveryManager` adds sampled frames for the lane.
 *   3. FAILED_PROCESSING — processing ended with a reason (plan limits named).
 *   4. STILL_PROCESSING — the document has not landed yet.
 *   5. OMITTED_UNSUPPORTED — only a row with no text and no status at all
 *      (predates the batch-7 pipeline); the lane is told nothing could be read.
 */
function resolveVideo(
  file: FileContentResponse,
  capabilities: ModelMediaCapabilities,
  options: AttachmentDeliveryOptions,
): AttachmentDeliveryDecision {
  const planRefused = isVideoPlanRefusal(file.media);
  const cancelled = isVideoProcessingCancelled(file.media);
  const native =
    options.nativeVideoTransport &&
    capabilities.videoInput !== MediaCapabilityState.UNSUPPORTED &&
    hasBytes(file) &&
    !planRefused &&
    !cancelled &&
    nativeVideoAllowed(file, options.videoPlan);
  if (native) {
    return decide(file, options, FileDeliveryMode.NATIVE_VIDEO, true);
  }
  if (hasVideoDocument(file)) {
    return decide(file, options, FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT, false);
  }
  if (videoProcessingFailed(file)) {
    return decide(
      file,
      options,
      FileDeliveryMode.FAILED_PROCESSING,
      false,
      failedVideoReason(planRefused, cancelled),
    );
  }
  if (videoInFlight(file)) {
    return decide(file, options, FileDeliveryMode.STILL_PROCESSING, false);
  }
  // A row with no text and no status (predates batch 7): nothing of it can be
  // read, and the lane is told so.
  return decide(
    file,
    options,
    FileDeliveryMode.OMITTED_UNSUPPORTED,
    false,
    DELIVERY_REASON_NO_VIDEO_INPUT,
  );
}

/** Why a FAILED video reached the lane as a note: plan, the owner's stop, or a processing failure. */
function failedVideoReason(planRefused: boolean, cancelled: boolean): string {
  const otherReason = cancelled
    ? DELIVERY_REASON_VIDEO_PROCESSING_CANCELLED
    : DELIVERY_REASON_FAILED_PROCESSING;
  return planRefused ? DELIVERY_REASON_VIDEO_PLAN_LIMIT : otherReason;
}

/**
 * The duration half of the native gate: measured (file-service finished its
 * probe), inside the provider limit, and inside a plan limit that was
 * actually read. Same comparison file-service uses (`durationMs > limit ×
 * 1000` is refused), so 60.4 s on a 60 s plan is not native.
 */
export function nativeVideoAllowed(
  file: FileContentResponse,
  plan: VideoPlanGate | undefined,
): boolean {
  const durationMs = file.media?.durationMs ?? null;
  if (durationMs === null || durationMs <= 0 || plan?.available !== true) {
    return false;
  }
  if (durationMs > NATIVE_VIDEO_MAX_DURATION_MS || videoInFlight(file)) {
    return false;
  }
  const limit = plan.limitSeconds;
  return limit === null || (limit > 0 && durationMs <= limit * SECOND_MS);
}

function resolveImage(
  file: FileContentResponse,
  capabilities: ModelMediaCapabilities,
  options: AttachmentDeliveryOptions,
): AttachmentDeliveryDecision {
  if (!laneSupportsVision(options.provider, capabilities.vision)) {
    return decide(file, options, FileDeliveryMode.OMITTED_NO_VISION, false);
  }
  if (hasBytes(file)) {
    return decide(file, options, FileDeliveryMode.NATIVE_IMAGE, true);
  }
  // A vision lane, but no bytes to send (an image extracted from an archive
  // carries only its OCR text). Recorded as what actually happened.
  return hasReadableImageText(file)
    ? decide(file, options, FileDeliveryMode.EXTRACTED_TEXT, false)
    : decide(
        file,
        options,
        FileDeliveryMode.OMITTED_UNSUPPORTED,
        false,
        DELIVERY_REASON_NO_IMAGE_BYTES,
      );
}

function resolveTextMode(file: FileContentResponse): FileDeliveryMode {
  const text = file.extractedText ?? '';
  if (text.trim().length === 0) {
    if (file.ingestionStatus === 'PENDING' || file.ingestionStatus === 'PROCESSING') {
      return FileDeliveryMode.STILL_PROCESSING;
    }
    if (file.ingestionStatus === 'FAILED') {
      return FileDeliveryMode.FAILED_PROCESSING;
    }
    return decodedContentLength(file) > MAX_FILE_CONTENT_LENGTH
      ? FileDeliveryMode.TRUNCATED_TEXT
      : FileDeliveryMode.EXTRACTED_TEXT;
  }
  return text.length > MAX_FILE_CONTENT_LENGTH || text.includes(TEXT_BUDGET_SHORTENED_MARKER)
    ? FileDeliveryMode.TRUNCATED_TEXT
    : FileDeliveryMode.EXTRACTED_TEXT;
}

function decide(
  file: FileContentResponse,
  options: AttachmentDeliveryOptions,
  mode: FileDeliveryMode,
  sendNative: boolean,
  reasonOverride?: string,
): AttachmentDeliveryDecision {
  const reason = reasonOverride ?? defaultReason(mode);
  return {
    fileId: file.id,
    filename: file.filename,
    mimeType: file.mimeType,
    provider: options.provider,
    model: options.model,
    mode,
    sendNative,
    ...(reason === undefined ? {} : { reason }),
  };
}

function defaultReason(mode: FileDeliveryMode): string | undefined {
  switch (mode) {
    case FileDeliveryMode.OMITTED_NO_VISION:
      return DELIVERY_REASON_NO_VISION;
    case FileDeliveryMode.OMITTED_UNSUPPORTED:
      return DELIVERY_REASON_UNSUPPORTED_MIME;
    case FileDeliveryMode.STILL_PROCESSING:
      return DELIVERY_REASON_STILL_PROCESSING;
    case FileDeliveryMode.FAILED_PROCESSING:
      return DELIVERY_REASON_FAILED_PROCESSING;
    case FileDeliveryMode.TRUNCATED_TEXT:
      return DELIVERY_REASON_TRUNCATED;
    default:
      return undefined;
  }
}

function hasBytes(file: FileContentResponse): boolean {
  return typeof file.content === 'string' && file.content.length > 0;
}

function hasReadableImageText(file: FileContentResponse): boolean {
  const text = file.extractedText?.trim() ?? '';
  return text.length > 0 && !text.startsWith(IMAGE_FILE_PLACEHOLDER_PREFIX);
}

function decodedContentLength(file: FileContentResponse): number {
  return Math.floor((file.content?.length ?? 0) * BASE64_DECODED_BYTES_PER_CHAR);
}

function isTextLikeMime(mime: string): boolean {
  if (mime.length === 0) {
    return false;
  }
  return TEXT_LIKE_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))
    ? true
    : TEXT_LIKE_MIME_EXACT.has(mime);
}

/**
 * Whether this file's bytes ride this lane's payload natively.
 *
 * The lane's delivery plan decides whenever there is one — the same decision
 * the provenance record holds. With no plan (estimates, tests) the behaviour
 * that predates ADR-120 applies: every image, and video only on the
 * Gemini-native transport (`geminiTransport`). Audio rides only on that
 * transport AND only when the plan says so — never by default, so an
 * OpenAI / Anthropic / Ollama payload never carries an audio part.
 */
export function isSentNatively(
  context: Pick<AssembledContext, 'attachmentDelivery'>,
  file: FileContentResponse,
  geminiTransport: boolean,
): boolean {
  const mime = (file.mimeType ?? '').toLowerCase();
  const decision = context.attachmentDelivery?.decisions.find(
    (candidate) => candidate.fileId === file.id,
  );
  if (mime.startsWith(AUDIO_MIME_PREFIX)) {
    return geminiTransport && decision?.mode === FileDeliveryMode.NATIVE_AUDIO
      ? decision.sendNative
      : false;
  }
  const isMedia =
    mime.startsWith(IMAGE_MIME_PREFIX) || (geminiTransport && mime.startsWith(VIDEO_MIME_PREFIX));
  if (!isMedia) {
    return false;
  }
  return decision === undefined ? true : decision.sendNative;
}

/**
 * Base64 of every image this lane really receives natively — local Ollama's
 * `/generate` `images[]`. A model that cannot see gets no bytes (ADR-120).
 */
export function nativeImageContents(
  context: Pick<AssembledContext, 'attachmentDelivery' | 'fileContents'>,
): string[] {
  const images = context.fileContents
    .filter(
      (file) =>
        (file.mimeType ?? '').toLowerCase().startsWith(IMAGE_MIME_PREFIX) &&
        isSentNatively(context, file, false),
    )
    .map((file) => file.content)
    .filter((content): content is string => content !== null && content.length > 0);
  return [...images, ...nativeVideoFrames(context).map((entry) => entry.frame.base64)];
}

/**
 * Every sampled video frame this lane receives as an image (a seeing lane on
 * the VIDEO_FRAMES_AND_TRANSCRIPT strategy), in attachment then time order,
 * with the video it came from — so each image can be labelled with its
 * timestamp. Empty for a blind lane: it gets the helper's observations.
 */
export function nativeVideoFrames(
  context: Pick<AssembledContext, 'attachmentDelivery'>,
): Array<{ filename: string; frame: VideoFrameImage }> {
  return (context.attachmentDelivery?.videoFrames ?? []).flatMap((set) =>
    set.frameDelivery === VideoFrameDelivery.NATIVE_IMAGES
      ? set.frames.map((frame) => ({ filename: set.filename, frame }))
      : [],
  );
}
