import { nonChatKindForModelKey } from '../model-kind.utility';

describe('nonChatKindForModelKey', () => {
  it('classifies the xAI multi-agent model as non-chat', () => {
    expect(nonChatKindForModelKey('grok-4.20-multi-agent-0309')).toBe('TOOL');
    expect(nonChatKindForModelKey('models/grok-4.20-multi-agent-0309')).toBe('TOOL');
    expect(nonChatKindForModelKey('GROK-MULTI-AGENT')).toBe('TOOL');
  });

  it('leaves ordinary chat models alone', () => {
    expect(nonChatKindForModelKey('grok-4.3')).toBeNull();
    expect(nonChatKindForModelKey('grok-4.20-0309-reasoning')).toBeNull();
    expect(nonChatKindForModelKey('gpt-4o-mini')).toBeNull();
    expect(nonChatKindForModelKey('multi-agentic-thing')).toBeNull();
  });
});

describe('nonChatKindForModelKey (speech, realtime, embeddings)', () => {
  it.each([
    'gpt-4o-mini-transcribe',
    'gpt-4o-mini-transcribe-2025-03-20',
    'gpt-4o-transcribe-diarize',
    'gpt-4o-mini-tts',
    'gpt-4o-mini-tts-2025-12-15',
    'gpt-4o-realtime-preview',
    'whisper-1',
    'models/gemini-2.5-flash-native-audio-preview-09-2025',
    'gemini-2.0-flash-live-001',
    'models/lyria-realtime-exp',
  ])('%s is AUDIO', (id) => {
    expect(nonChatKindForModelKey(id)).toBe('AUDIO');
  });

  it.each(['text-embedding-3-small', 'nomic-embed-text'])('%s is EMBEDDING', (id) => {
    expect(nonChatKindForModelKey(id)).toBe('EMBEDDING');
  });

  it('classifies rerankers and agent-only endpoints', () => {
    expect(nonChatKindForModelKey('bge-reranker-v2')).toBe('RERANKER');
    expect(nonChatKindForModelKey('omni-moderation-latest')).toBe('TOOL');
    expect(nonChatKindForModelKey('gemini-2.5-computer-use-preview')).toBe('TOOL');
    expect(nonChatKindForModelKey('models/aqa')).toBe('TOOL');
  });

  it('keeps real chat models, including audio-input chat models, as chat', () => {
    expect(nonChatKindForModelKey('gpt-4o-audio-preview')).toBeNull();
    expect(nonChatKindForModelKey('gpt-4o-mini')).toBeNull();
    expect(nonChatKindForModelKey('gemini-2.5-flash')).toBeNull();
    expect(nonChatKindForModelKey('deliverable-llama')).toBeNull();
  });
});

describe('nonChatKindForModelKey (Gemini agent and media-generation models)', () => {
  it.each([
    'models/gemini-2.5-flash-preview-tts',
    'models/gemini-2.5-pro-preview-tts',
    'models/gemini-3.1-flash-tts-preview',
    'models/lyria-3-clip-preview',
    'models/lyria-3-pro-preview',
  ])('%s is AUDIO', (id) => {
    expect(nonChatKindForModelKey(id)).toBe('AUDIO');
  });

  it.each([
    'models/deep-research-preview-04-2026',
    'models/deep-research-max-preview-04-2026',
    'models/deep-research-pro-preview-12-2025',
    'models/gemini-2.5-computer-use-preview-10-2025',
    'models/antigravity-preview-05-2026',
    'models/antigravity-preview-latest',
  ])('%s is TOOL', (id) => {
    expect(nonChatKindForModelKey(id)).toBe('TOOL');
  });

  it('keeps nano-banana a chat-listed model: it is redirected to image generation, not hidden', () => {
    expect(nonChatKindForModelKey('models/nano-banana-pro-preview')).toBeNull();
  });
});
