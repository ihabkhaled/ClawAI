import { VIDEO_MIME_PREFIX } from '../../../common/constants/execution.constants';
import { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';
import { MediaCapabilityState } from '../../../common/enums/media-capability-state.enum';
import {
  BASE64_DECODED_BYTES_PER_CHAR,
  DELIVERY_REASON_FAILED_PROCESSING,
  DELIVERY_REASON_NO_IMAGE_BYTES,
  DELIVERY_REASON_NO_VIDEO_INPUT,
  DELIVERY_REASON_NO_VISION,
  DELIVERY_REASON_STILL_PROCESSING,
  DELIVERY_REASON_TRUNCATED,
  DELIVERY_REASON_UNSUPPORTED_MIME,
} from '../constants/attachment-delivery.constants';
import { TEXT_BUDGET_SHORTENED_MARKER } from '../constants/evidence-fit.constants';
import { MAX_FILE_CONTENT_LENGTH } from '../constants/file-content.constants';
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
import type {
  AttachmentDeliveryDecision,
  AttachmentDeliveryOptions,
} from '../types/attachment-delivery.types';
import type { AssembledContext, FileContentResponse } from '../types/context.types';
import type { FileDeliveryEntry } from '../types/file-delivery.types';
import type { ModelMediaCapabilities } from '../types/model-capability.types';

/**
 * How each attachment reaches ONE lane — the single classifier behind both the
 * provider payload and the `FileDeliveryMode` record (ADR-120).
 *
 *   audio → TRANSCRIPT / STILL_PROCESSING / FAILED_PROCESSING (never bytes)
 *   video → NATIVE_VIDEO when the lane really sends it, else OMITTED_UNSUPPORTED
 *   image → NATIVE_IMAGE when the model can see, else OMITTED_NO_VISION (no
 *           bytes; the OCR text and an honest note instead). Batch 3's helper
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
    return decide(file, options, resolveAudioMode(file), false);
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

function resolveVideo(
  file: FileContentResponse,
  capabilities: ModelMediaCapabilities,
  options: AttachmentDeliveryOptions,
): AttachmentDeliveryDecision {
  const native =
    options.nativeVideoTransport &&
    capabilities.videoInput !== MediaCapabilityState.UNSUPPORTED &&
    hasBytes(file);
  return native
    ? decide(file, options, FileDeliveryMode.NATIVE_VIDEO, true)
    : decide(
        file,
        options,
        FileDeliveryMode.OMITTED_UNSUPPORTED,
        false,
        DELIVERY_REASON_NO_VIDEO_INPUT,
      );
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
 * Gemini-native transport (`includeVideo`).
 */
export function isSentNatively(
  context: Pick<AssembledContext, 'attachmentDelivery'>,
  file: FileContentResponse,
  includeVideo: boolean,
): boolean {
  const mime = (file.mimeType ?? '').toLowerCase();
  const isMedia =
    mime.startsWith(IMAGE_MIME_PREFIX) || (includeVideo && mime.startsWith(VIDEO_MIME_PREFIX));
  if (!isMedia) {
    return false;
  }
  const decision = context.attachmentDelivery?.decisions.find(
    (candidate) => candidate.fileId === file.id,
  );
  return decision === undefined ? true : decision.sendNative;
}

/**
 * Base64 of every image this lane really receives natively — local Ollama's
 * `/generate` `images[]`. A model that cannot see gets no bytes (ADR-120).
 */
export function nativeImageContents(
  context: Pick<AssembledContext, 'attachmentDelivery' | 'fileContents'>,
): string[] {
  return context.fileContents
    .filter(
      (file) =>
        (file.mimeType ?? '').toLowerCase().startsWith(IMAGE_MIME_PREFIX) &&
        isSentNatively(context, file, false),
    )
    .map((file) => file.content)
    .filter((content): content is string => content !== null && content.length > 0);
}
