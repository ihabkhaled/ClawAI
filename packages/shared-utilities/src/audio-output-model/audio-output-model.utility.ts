import {
  AUDIO_MUSIC_MODEL_PATTERN,
  AUDIO_SPEECH_MODEL_PATTERN,
  type AudioOutputKind,
} from './audio-output-model.constants';

/** `speech` or `music` for an audio-output model id, `undefined` for anything else. */
export function classifyAudioOutputModel(model: string): AudioOutputKind | undefined {
  const id = model.trim();
  if (AUDIO_MUSIC_MODEL_PATTERN.test(id)) return 'MUSIC';
  return AUDIO_SPEECH_MODEL_PATTERN.test(id) ? 'SPEECH' : undefined;
}

/** Whether a model id produces audio rather than text. */
export function isAudioOutputModel(model: string): boolean {
  return classifyAudioOutputModel(model) !== undefined;
}
