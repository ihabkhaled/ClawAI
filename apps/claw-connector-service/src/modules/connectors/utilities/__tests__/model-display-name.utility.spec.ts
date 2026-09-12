import { formatModelDisplayName } from '../model-display-name.utility';

describe('formatModelDisplayName', () => {
  // The bug this exists for: Gemini's /models returns namespaced ids, and the
  // old formatter title-cased the whole string, so the picker and the public
  // catalog both showed "Models/gemini 2.5 Pro".
  it('strips a provider namespace prefix', () => {
    expect(formatModelDisplayName('models/gemini-2.5-pro')).toBe('Gemini 2.5 Pro');
    expect(formatModelDisplayName('models/gemini-2.5-flash')).toBe('Gemini 2.5 Flash');
  });

  it('keeps acronyms uppercase instead of title-casing them', () => {
    expect(formatModelDisplayName('models/gemini-2.5-flash-preview-tts')).toContain('TTS');
    expect(formatModelDisplayName('gpt-4o')).toContain('GPT');
  });

  it('leaves version and size tokens alone', () => {
    // "70B" and "4O" read as typos; the provider's own casing is correct.
    expect(formatModelDisplayName('llama-3.1-70b')).toBe('Llama 3.1 70b');
    expect(formatModelDisplayName('gpt-4o')).toBe('GPT 4o');
  });

  it('is idempotent, so applying it on read as well as on write is safe', () => {
    const once = formatModelDisplayName('models/gemini-2.5-pro');
    expect(formatModelDisplayName(once)).toBe(once);
  });

  it('handles underscores and plain names without a namespace', () => {
    expect(formatModelDisplayName('claude_opus_4')).toBe('Claude Opus 4');
    expect(formatModelDisplayName('mistral')).toBe('Mistral');
  });

  it('never returns an empty name for a degenerate id', () => {
    expect(formatModelDisplayName('models/')).toBe('Models');
  });
});
