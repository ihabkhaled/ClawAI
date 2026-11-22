import {
  classifyGeminiModelKind,
  geminiKindReason,
  readGenerationMethods,
} from '../gemini-model-kind.utility';

describe('classifyGeminiModelKind', () => {
  it('keeps a generateContent model as CHAT', () => {
    expect(classifyGeminiModelKind(['generateContent', 'countTokens'])).toBe('CHAT');
  });

  it('classifies an embedContent-only model as EMBEDDING', () => {
    expect(classifyGeminiModelKind(['embedContent', 'countTextTokens'])).toBe('EMBEDDING');
    expect(classifyGeminiModelKind(['batchEmbedContents', 'asyncBatchEmbedContent'])).toBe(
      'EMBEDDING',
    );
  });

  it('classifies aqa (generateAnswer only) as TOOL', () => {
    expect(classifyGeminiModelKind(['generateAnswer'])).toBe('TOOL');
  });

  it('raises no objection when the method list is unknown or empty', () => {
    expect(classifyGeminiModelKind(undefined)).toBe('CHAT');
    expect(classifyGeminiModelKind([])).toBe('CHAT');
  });

  it('lets generateContent win over an embedding method', () => {
    expect(classifyGeminiModelKind(['embedContent', 'generateContent'])).toBe('CHAT');
  });
});

describe('geminiKindReason', () => {
  it("quotes Google's method list for a non-chat model", () => {
    expect(geminiKindReason(['createDecision'])).toBe('Google lists only: createDecision');
  });

  it('is undefined for a chat model or an unreadable list', () => {
    expect(geminiKindReason(['generateContent', 'countTokens'])).toBeUndefined();
    expect(geminiKindReason(undefined)).toBeUndefined();
  });
});

describe('readGenerationMethods', () => {
  it('returns strings only and undefined for a non-array', () => {
    expect(readGenerationMethods(['a', 1, 'b'])).toEqual(['a', 'b']);
    expect(readGenerationMethods('generateContent')).toBeUndefined();
    expect(readGenerationMethods(undefined)).toBeUndefined();
  });
});
