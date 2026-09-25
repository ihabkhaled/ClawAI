import {
  type CreateImageGenerationData,
  type ImageGenerationLatestSummary,
  type ImageGenerationRecord,
} from '../types/image-generation.types';

/** The part of the chain head a card needs to render it. */
export function toLatestSummary(record: ImageGenerationRecord): ImageGenerationLatestSummary {
  return {
    id: record.id,
    status: record.status,
    provider: record.provider,
    model: record.model,
    errorCode: record.errorCode,
    errorMessage: record.errorMessage,
    supersededById: record.supersededById,
    assets: record.assets,
  };
}

/**
 * The same job on another provider/model: owner, thread/message links, prompt
 * and size carried over. `keepStyle` is false for an AUTO fallback, which has
 * always started clean because quality/style values are provider-specific.
 */
export function successorDataFrom(
  source: ImageGenerationRecord,
  target: { provider: string; model: string },
  keepStyle: boolean,
): CreateImageGenerationData {
  return {
    userId: source.userId,
    threadId: source.threadId ?? undefined,
    userMessageId: source.userMessageId ?? undefined,
    assistantMessageId: source.assistantMessageId ?? undefined,
    prompt: source.prompt,
    provider: target.provider,
    model: target.model,
    width: source.width,
    height: source.height,
    quality: keepStyle ? (source.quality ?? undefined) : undefined,
    style: keepStyle ? (source.style ?? undefined) : undefined,
  };
}
