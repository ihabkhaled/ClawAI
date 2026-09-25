import { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';
import { BASE64_DECODED_BYTES_PER_CHAR } from '../constants/attachment-delivery.constants';
import { FILE_FIT_BUDGET_SHARE } from '../constants/evidence-fit.constants';
import {
  NATIVE_AUDIO_FILE_SHARE_FRACTION,
  NATIVE_AUDIO_FIT_BYTES_PER_SECOND,
  NATIVE_AUDIO_TOKENS_PER_SECOND,
  NATIVE_VIDEO_HOLD_TOKENS_PER_SECOND,
} from '../constants/native-audio.constants';
import { SECOND_MS } from '../constants/video-timestamp.constants';
import type { AssembledContext, FileContentResponse } from '../types/context.types';

/** Decoded size of a file's base64 bytes (0 when there are none). */
export function decodedAudioBytes(file: Pick<FileContentResponse, 'content'>): number {
  return Math.floor((file.content?.length ?? 0) * BASE64_DECODED_BYTES_PER_CHAR);
}

/**
 * Prompt tokens a recording is assumed to cost when sent natively: its length
 * estimated from bytes at a deliberately low bitrate (errs long), times
 * Gemini's 32 audio tokens per second. Fit only — billing is measured usage.
 */
export function estimateNativeAudioTokens(file: Pick<FileContentResponse, 'content'>): number {
  const seconds = Math.ceil(decodedAudioBytes(file) / NATIVE_AUDIO_FIT_BYTES_PER_SECOND);
  return seconds * NATIVE_AUDIO_TOKENS_PER_SECOND;
}

/** The audio slice of this lane's file share, in prompt tokens (rule 51 item 4). */
export function nativeAudioTokenBudget(modelBudget: AssembledContext['modelBudget']): number {
  const inputTokens = Math.max(
    0,
    modelBudget.contextWindowTokens - modelBudget.reservedOutputTokens,
  );
  return Math.floor(inputTokens * FILE_FIT_BUDGET_SHARE * NATIVE_AUDIO_FILE_SHARE_FRACTION);
}

/** Whether any attachment rides this lane's payload as native audio. */
export function hasNativeAudioDelivery(
  context: Pick<AssembledContext, 'attachmentDelivery'>,
): boolean {
  return (context.attachmentDelivery?.decisions ?? []).some(
    (decision) => decision.mode === FileDeliveryMode.NATIVE_AUDIO && decision.sendNative,
  );
}

/**
 * Estimated prompt tokens of every native audio part on this lane — added to
 * the text estimate when the PAYG hold is sized, so the hold covers the audio
 * the provider will measure and bill.
 */
export function nativeAudioTokenEstimate(
  context: Pick<AssembledContext, 'attachmentDelivery' | 'fileContents'>,
): number {
  const nativeIds = new Set(
    (context.attachmentDelivery?.decisions ?? [])
      .filter((decision) => decision.mode === FileDeliveryMode.NATIVE_AUDIO && decision.sendNative)
      .map((decision) => decision.fileId),
  );
  // Most turns carry no native audio: answer 0 before reading the files at all.
  return nativeIds.size === 0
    ? 0
    : context.fileContents
        .filter((file) => nativeIds.has(file.id))
        .reduce((total, file) => total + estimateNativeAudioTokens(file), 0);
}

/** `audio/webm;codecs=opus` → `audio/webm`: a data URL's media type carries no parameters. */
export function payloadMediaType(mimeType: string): string {
  return (mimeType.split(';')[0] ?? mimeType).trim();
}

/**
 * Estimated prompt tokens of every video riding this lane natively, from its
 * measured duration — the video half of the hold estimate.
 */
export function nativeVideoTokenEstimate(
  context: Pick<AssembledContext, 'attachmentDelivery' | 'fileContents'>,
): number {
  const nativeIds = new Set(
    (context.attachmentDelivery?.decisions ?? [])
      .filter((decision) => decision.mode === FileDeliveryMode.NATIVE_VIDEO && decision.sendNative)
      .map((decision) => decision.fileId),
  );
  return nativeIds.size === 0
    ? 0
    : context.fileContents
        .filter((file) => nativeIds.has(file.id))
        .reduce(
          (total, file) =>
            total +
            Math.ceil((file.media?.durationMs ?? 0) / SECOND_MS) *
              NATIVE_VIDEO_HOLD_TOKENS_PER_SECOND,
          0,
        );
}

/** Native audio + native video tokens the text estimate cannot see (PAYG hold sizing). */
export function nativeMediaTokenEstimate(
  context: Pick<AssembledContext, 'attachmentDelivery' | 'fileContents'>,
): number {
  return nativeAudioTokenEstimate(context) + nativeVideoTokenEstimate(context);
}
