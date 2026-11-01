import { type AudioOutputKind, classifyAudioOutputModel } from '../audio-output-model';
import {
  inferImageCapabilityProvider,
  resolveImageCapabilityProvider,
} from '../image-output-model';
import { inferVideoCapabilityProvider, resolveVideoCapabilityProvider } from '../video-generation';
import {
  MEDIA_MODALITIES_OUT,
  type MediaOutputKind,
  MODALITY_OUT_BY_MEDIA_KIND,
} from './media-output-model.constants';
import { PRICED_MEDIA_MODEL_KEYS_BY_PROVIDER } from './priced-media-models.constants';

export type MediaOutputClassification = {
  kind: MediaOutputKind;
  /** Only for AUDIO: text-to-speech / native audio vs music. */
  audioKind?: AudioOutputKind;
  /** The `ModalityKind` the registry stores in `modalitiesOut`. */
  modality: string;
};

/**
 * What a model id OUTPUTS when it is not text, or `undefined` for an ordinary
 * chat model. One classifier for the connector snapshot, routing and the
 * pickers, built from the image / video / audio pattern tables, so a new id of
 * a known shape is covered without a code path per provider.
 *
 * With the connector known its own pattern table is used; without it the first
 * table that matches wins.
 */
export function classifyMediaOutputModel(
  model: string,
  connectorProvider?: string,
): MediaOutputClassification | undefined {
  const id = model.trim();
  const connector = connectorProvider?.trim() ?? '';
  const image =
    connector === ''
      ? inferImageCapabilityProvider(id)
      : resolveImageCapabilityProvider(connector, id);
  if (image !== undefined) return build('IMAGE');
  const video =
    connector === ''
      ? inferVideoCapabilityProvider(id)
      : resolveVideoCapabilityProvider(connector, id);
  if (video !== undefined) return build('VIDEO');
  const audioKind = classifyAudioOutputModel(id);
  return audioKind === undefined ? undefined : build('AUDIO', audioKind);
}

function build(kind: MediaOutputKind, audioKind?: AudioOutputKind): MediaOutputClassification {
  return {
    kind,
    ...(audioKind === undefined ? {} : { audioKind }),
    modality: MODALITY_OUT_BY_MEDIA_KIND.get(kind) ?? 'TEXT',
  };
}

/** True when the model produces image, video or audio instead of text. */
export function isMediaOutputModel(model: string, connectorProvider?: string): boolean {
  return classifyMediaOutputModel(model, connectorProvider) !== undefined;
}

/** `modalitiesOut` for a snapshot row: the media modality, or `['TEXT']` for a chat model. */
export function modalitiesOutForModel(model: string, connectorProvider?: string): string[] {
  const media = classifyMediaOutputModel(model, connectorProvider);
  return media === undefined ? ['TEXT'] : [media.modality];
}

/** True when a stored `modalitiesOut` list marks a media-output model. */
export function hasMediaModalityOut(modalitiesOut: readonly string[] | undefined): boolean {
  return (modalitiesOut ?? []).some((value) => MEDIA_MODALITIES_OUT.includes(value));
}

/** True when the model is a media-generation model routing's cost seed prices (exposed by policy). */
export function isPricedMediaModel(provider: string, modelKey: string): boolean {
  const id = modelKey.trim().replace(/^models\//u, '');
  return PRICED_MEDIA_MODEL_KEYS_BY_PROVIDER.get(provider.trim().toUpperCase())?.has(id) === true;
}
