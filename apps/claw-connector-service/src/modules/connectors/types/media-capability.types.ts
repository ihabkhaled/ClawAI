/** Per-model `supportsAudio` decision for one OpenAI listing. */
export type OpenAiAudioFlagResolution = {
  /** modelKey → supportsAudio. */
  flags: Map<string, boolean>;
  /** True when the listing had no audio-input model and the provider-level rule applied. */
  usedProviderFallback: boolean;
};
