import { RequiredModality } from '@claw/shared-types';

import { ModalityFit } from '../../../common/enums/modality-fit.enum';

/**
 * Multimodal batch 8 — AUTO's candidate tiers by modality fit (rule 51 item 13).
 * Lower ranks first; within a tier the existing order (ACTIVE first, one model
 * per provider in turn) is unchanged.
 */
export const MODALITY_FIT_RANK: Readonly<Record<ModalityFit, number>> = {
  [ModalityFit.DIRECT]: 0,
  [ModalityFit.TRANSFORMED]: 1,
  [ModalityFit.DEGRADED]: 2,
};

/** The values `message.created` may carry in `requiredModalities` / `transformableModalities`. */
export const KNOWN_REQUIRED_MODALITIES: ReadonlySet<string> = new Set<string>(
  Object.values(RequiredModality),
);

/** At most this many attachment mime types are read from one event (chat caps files at 10). */
export const MAX_ATTACHMENT_MIME_TYPES = 10;
export const MAX_ATTACHMENT_MIME_TYPE_LENGTH = 255;

/** One line per candidate in the cloud router prompt, by fit. */
export const MODALITY_FIT_PROMPT_NOTES: Readonly<Record<ModalityFit, string>> = {
  [ModalityFit.DIRECT]: 'reads the attachments directly',
  [ModalityFit.TRANSFORMED]: 'cannot read every attachment itself; ClawAI converts them to text',
  [ModalityFit.DEGRADED]: 'cannot read an attachment; it would get only a partial text version',
};
