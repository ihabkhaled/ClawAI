import { describe, expect, it } from 'vitest';

import { toFileContentCandidates } from '../file-writer.utility';

const admin = (provider: string, modelAlias: string) => ({
  provider,
  modelAlias,
  timeoutMs: 120_000,
  maxTokens: 8_192,
});

describe('toFileContentCandidates', () => {
  it('maps routing provider names to chat provider names, admin order first', () => {
    expect(
      toFileContentCandidates(
        [admin('OLLAMA_CLOUD', 'gpt-oss:120b'), admin('GEMINI', 'gemini-3.6-flash')],
        ['qwen3:8b'],
      ),
    ).toEqual([
      { provider: 'OLLAMA', model: 'gpt-oss:120b' },
      { provider: 'GEMINI', model: 'gemini-3.6-flash' },
      { provider: 'local-ollama', model: 'qwen3:8b' },
    ]);
  });

  // The hard-coded claude-sonnet-4 / gpt-4o-mini / gemini-2.5-flash are gone:
  // with nothing configured the list is empty and the caller says so.
  it('adds no hidden provider when nothing is configured', () => {
    expect(toFileContentCandidates([], [])).toEqual([]);
  });

  it('skips AUTO and duplicates', () => {
    expect(
      toFileContentCandidates(
        [admin('OLLAMA_CLOUD', 'glm-5.3'), admin('OLLAMA_CLOUD', 'glm-5.3')],
        ['AUTO'],
      ),
    ).toEqual([{ provider: 'OLLAMA', model: 'glm-5.3' }]);
  });
});
