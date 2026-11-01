/** The kinds of media a model can OUTPUT instead of text. */
export type MediaOutputKind = 'IMAGE' | 'VIDEO' | 'AUDIO';

/** The routing-service `ModalityKind` member for each media kind. */
export const MODALITY_OUT_BY_MEDIA_KIND: ReadonlyMap<MediaOutputKind, string> = new Map([
  ['IMAGE', 'IMAGE_OUTPUT'],
  ['VIDEO', 'VIDEO_OUTPUT'],
  ['AUDIO', 'AUDIO_OUTPUT'],
]);

/** Every media `modalitiesOut` member; a row carrying one is not a chat-completion model. */
export const MEDIA_MODALITIES_OUT: readonly string[] = [...MODALITY_OUT_BY_MEDIA_KIND.values()];
