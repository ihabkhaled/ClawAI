import { SHARED_MATERIAL_VERSION } from '../constants/source-prompt.constants';
import type { GenerationPipelineInput } from '../types/generation-pipeline.types';
import { withAttachmentTurns } from './source-attachments.utility';

/**
 * The JSON every role's user prompt starts with. The topic box goes in as `authorInstructions`,
 * not as a title, and the chat snapshot as `sourceConversation`, whole: fitting it to a model
 * window is the healer's job (`shrinkSharedMaterial`), never a cut here. Text of files attached to
 * a turn rides in as its own turn (`withAttachmentTurns`), so the healer fits it like a long message.
 */
export function buildSharedMaterial(
  job: Pick<GenerationPipelineInput, 'topic' | 'publicationType' | 'sourceSnapshot'>,
  researchEvidence: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    version: SHARED_MATERIAL_VERSION,
    authorInstructions: job.topic,
    publicationType: job.publicationType,
    sourceConversation: withAttachmentTurns(job.sourceSnapshot),
    researchEvidence,
    ...extra,
  });
}
