import { synthesizeLyria } from '../adapters/gemini-lyria.adapter';
import { synthesizeGeminiSpeech } from '../adapters/gemini-speech.adapter';
import { synthesizeOpenAiSpeech } from '../adapters/openai-speech.adapter';
import type { AudioProviderClient } from '../types/audio-generation.types';

export const openAiSpeechClient: AudioProviderClient = { synthesize: synthesizeOpenAiSpeech };
export const geminiSpeechClient: AudioProviderClient = { synthesize: synthesizeGeminiSpeech };
export const geminiLyriaClient: AudioProviderClient = { synthesize: synthesizeLyria };

/** `<KIND>:<PROVIDER>` to the adapter that serves it. Anything absent is unsupported. */
export const AUDIO_CLIENTS: ReadonlyMap<string, AudioProviderClient> = new Map([
  ['SPEECH:AUDIO_OPENAI', openAiSpeechClient],
  ['SPEECH:AUDIO_GEMINI', geminiSpeechClient],
  ['MUSIC:AUDIO_GEMINI', geminiLyriaClient],
]);
