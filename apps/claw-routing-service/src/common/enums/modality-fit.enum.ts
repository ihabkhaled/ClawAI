/**
 * How well one AUTO candidate fits the turn's attachments (multimodal batch 8,
 * rule 51 item 13). Ranking, not a verdict on the model: every tier is still
 * served by chat-service, which transforms what a model cannot read.
 */
export enum ModalityFit {
  /** Reads every attached modality directly (or the turn has no attachments). */
  DIRECT = 'DIRECT',
  /**
   * Cannot read some attachment, but chat-service turns every such modality
   * into text for it (audio → transcript, video → frames + transcript, image →
   * helper vision when the plan includes it).
   */
  TRANSFORMED = 'TRANSFORMED',
  /**
   * Cannot read an attachment that chat-service cannot transform for this
   * user (an image on a plan without helper vision): the model would get OCR
   * and an honest note at best. Offered only when nothing better exists.
   */
  DEGRADED = 'DEGRADED',
}
