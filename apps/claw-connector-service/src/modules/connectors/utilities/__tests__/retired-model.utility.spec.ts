import { isRetiredOpenAiModel } from '../retired-model.utility';

describe('isRetiredOpenAiModel (ADR-151)', () => {
  it.each([
    'gpt-3.5-turbo-1106',
    'gpt-3.5-turbo-instruct',
    'gpt-3.5-turbo-instruct-0914',
    'gpt-4o-mini-search-preview',
    'gpt-4o-mini-search-preview-2025-03-11',
    'gpt-4o-search-preview',
    'gpt-4o-search-preview-2025-03-11',
    'gpt-5-chat-latest',
    'gpt-5.1-chat-latest',
    'gpt-5.2-chat-latest',
    'gpt-5.3-chat-latest',
    'gpt-5-codex',
    'gpt-5.1-codex',
    'gpt-5.1-codex-max',
    'gpt-5.1-codex-mini',
    'gpt-5.2-codex',
    'GPT-5-CODEX',
  ])('%s is retired', (model) => {
    expect(isRetiredOpenAiModel(model)).toBe(true);
  });

  it.each([
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-0125',
    'gpt-3.5-turbo-16k',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-5',
    'gpt-5-mini',
    'o3',
    'o4-mini',
  ])('%s keeps working', (model) => {
    expect(isRetiredOpenAiModel(model)).toBe(false);
  });
});
