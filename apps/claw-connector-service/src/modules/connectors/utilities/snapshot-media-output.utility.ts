import { classifyMediaOutputModel } from '@claw/shared-utilities';

/**
 * The output side of a snapshot row, from the shared model-id classifier.
 *
 * The catalog has no IMAGE/VIDEO/AUDIO-output model kind, so a media model is a
 * CHAT row and only its id says it does not answer chat completions. A chat
 * model gets `['TEXT']`; a media model gets its `*_OUTPUT` modality plus
 * `mediaKind` (and `audioKind`: SPEECH or MUSIC) so pickers can type it.
 */
export function snapshotMediaOutputFields(
  modelKey: string,
  providerKey: string,
): { modalitiesOut: string[]; mediaKind?: string; audioKind?: string } {
  const media = classifyMediaOutputModel(modelKey, providerKey);
  if (media === undefined) return { modalitiesOut: ['TEXT'] };
  return {
    modalitiesOut: [media.modality],
    mediaKind: media.kind,
    ...(media.audioKind === undefined ? {} : { audioKind: media.audioKind }),
  };
}
