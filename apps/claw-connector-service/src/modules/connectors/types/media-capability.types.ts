import { type ConnectorModel } from '../../../generated/prisma';

/** Per-model `supportsAudio` decision for one OpenAI listing. */
export type OpenAiAudioFlagResolution = {
  /** modelKey → supportsAudio. */
  flags: Map<string, boolean>;
  /** True when the listing had no audio-input model and the provider-level rule applied. */
  usedProviderFallback: boolean;
};

/** The four columns the snapshot's media narrowing reads off a `ConnectorModel` row. */
export type SnapshotMediaRow = Pick<
  ConnectorModel,
  'provider' | 'modelKey' | 'supportsAudio' | 'supportsVideoInput'
>;
