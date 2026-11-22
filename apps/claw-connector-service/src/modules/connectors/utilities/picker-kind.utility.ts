import { classifyAudioOutputModel } from '@claw/shared-utilities';

/**
 * Whether a model of this kind can appear in the chat picker at all: CHAT, or
 * an AUDIO model that GENERATES audio (speech, music). Input-only audio
 * (whisper, transcribe, realtime), EMBEDDING, RERANKER and TOOL never do,
 * whatever their exposure. The one rule `getAvailableModels`, the exposure
 * warning and the visibility diagnostic share.
 */
export function isPickerKind(kind: string, modelKey: string): boolean {
  return kind === 'CHAT' || (kind === 'AUDIO' && classifyAudioOutputModel(modelKey) !== undefined);
}
