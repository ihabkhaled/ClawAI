/**
 * A non-text input a turn's attachments need a model to read (multimodal
 * batch 8, ADR-120 addendum). chat-service derives the list from the real
 * attachment mime types and sends it on `message.created`; routing-service's
 * AUTO candidate ranking reads it (rule 51 item 13).
 *
 * The values match routing-service's `ModalityKind` members of the same name,
 * so a registry row's `modalitiesIn` answers "can this model read it directly".
 */
export enum RequiredModality {
  IMAGE_INPUT = 'IMAGE_INPUT',
  VIDEO_INPUT = 'VIDEO_INPUT',
  AUDIO_INPUT = 'AUDIO_INPUT',
}
