import { describe, expect, it } from 'vitest';

import {
  fileWriterField,
  fileWriterOptionsFor,
  parseFileWriter,
  rerouteFileFollowUp,
  stripWriterReasoning,
  toFileContentCandidates,
} from '../file-writer.utility';

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

  // F6 (ADR-119): a user who picked a model gets their file written by it,
  // with the admin writers behind it if it fails.
  it('tries the user-picked writer first, then the admin list', () => {
    expect(
      toFileContentCandidates([admin('OLLAMA_CLOUD', 'gemma4:31b')], ['qwen3:8b'], {
        preferred: { provider: 'GEMINI', model: 'models/gemini-2.5-flash' },
      }),
    ).toEqual([
      { provider: 'GEMINI', model: 'models/gemini-2.5-flash' },
      { provider: 'OLLAMA', model: 'gemma4:31b' },
      { provider: 'local-ollama', model: 'qwen3:8b' },
    ]);
  });

  it('does not repeat a preferred writer that is also on the admin list', () => {
    expect(
      toFileContentCandidates([admin('OLLAMA_CLOUD', 'gemma4:31b')], [], {
        preferred: { provider: 'OLLAMA', model: 'gemma4:31b' },
      }),
    ).toEqual([{ provider: 'OLLAMA', model: 'gemma4:31b' }]);
  });

  // LOCAL_ONLY / PRIVACY_FIRST: the admin writers are hosted, so the content
  // would leave the machine. Only local writers may write it.
  it('uses local writers only when the mode is local-only', () => {
    expect(
      toFileContentCandidates([admin('OLLAMA_CLOUD', 'gemma4:31b')], ['qwen3:8b', 'AUTO'], {
        localOnly: true,
        preferred: { provider: 'GEMINI', model: 'models/gemini-2.5-flash' },
      }),
    ).toEqual([{ provider: 'local-ollama', model: 'qwen3:8b' }]);
  });
});

describe('fileWriterOptionsFor', () => {
  it('carries the manual pick as the preferred writer', () => {
    expect(
      fileWriterOptionsFor({
        routingMode: 'MANUAL_MODEL',
        fileWriter: { provider: 'OLLAMA', model: 'gemma4:31b' },
      }),
    ).toEqual({ preferred: { provider: 'OLLAMA', model: 'gemma4:31b' } });
  });

  it.each(['LOCAL_ONLY', 'PRIVACY_FIRST'])('%s allows local writers only', (routingMode) => {
    expect(fileWriterOptionsFor({ routingMode })).toEqual({ localOnly: true });
  });

  it('AUTO keeps the admin list', () => {
    expect(fileWriterOptionsFor({ routingMode: 'AUTO' })).toEqual({});
  });
});

describe('parseFileWriter', () => {
  it('reads a well-formed writer', () => {
    expect(parseFileWriter({ provider: 'GEMINI', model: 'models/gemini-2.5-flash' })).toEqual({
      provider: 'GEMINI',
      model: 'models/gemini-2.5-flash',
    });
  });

  it.each([
    undefined,
    null,
    'GEMINI',
    { provider: 'GEMINI' },
    { provider: '', model: 'x' },
    { provider: 1, model: 'x' },
  ])('ignores a malformed writer: %j', (raw) => {
    expect(parseFileWriter(raw)).toBeUndefined();
  });
});

describe('rerouteFileFollowUp', () => {
  const base = {
    messageId: 'm',
    threadId: 't',
    timestamp: '2026-09-25T00:00:00.000Z',
  };

  it('keeps the manual pick as the writer of the next file', () => {
    expect(
      rerouteFileFollowUp({
        ...base,
        selectedProvider: 'GEMINI',
        selectedModel: 'models/gemini-2.5-flash',
        routingMode: 'MANUAL_MODEL',
      }),
    ).toEqual(
      expect.objectContaining({
        selectedProvider: 'FILE_GENERATION',
        selectedModel: 'auto',
        fileWriter: { provider: 'GEMINI', model: 'models/gemini-2.5-flash' },
      }),
    );
  });

  it('AUTO re-routes with no writer preference', () => {
    const out = rerouteFileFollowUp({
      ...base,
      selectedProvider: 'OLLAMA',
      selectedModel: 'gpt-oss:120b',
      routingMode: 'AUTO',
    });
    expect(out.selectedProvider).toBe('FILE_GENERATION');
    expect(out.fileWriter).toBeUndefined();
  });
});

// Live 2026-09-25: Gemini-hosted gemma models put a <thought>…</thought>
// block before the table; 12 files shipped the model's reasoning, and 2 CSVs
// were a single column of it.
describe('stripWriterReasoning', () => {
  it('drops a leading thought block', () => {
    expect(
      stripWriterReasoning(
        '<thought>* Task: CSV\n* Yes.</thought>| a | b |\n| --- | --- |\n| 1 | 2 |',
      ),
    ).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |');
  });

  it('drops <think> blocks anywhere', () => {
    expect(stripWriterReasoning('# Title\n<think>plan</think>\nBody')).toBe('# Title\n\nBody');
  });

  it('leaves content without reasoning untouched', () => {
    expect(stripWriterReasoning('# Title\n\nBody')).toBe('# Title\n\nBody');
  });

  it('keeps the original when reasoning was all there was', () => {
    expect(stripWriterReasoning('<thought>only this</thought>')).toBe(
      '<thought>only this</thought>',
    );
  });
});

describe('fileWriterField', () => {
  it('spreads a valid writer and nothing otherwise', () => {
    expect(fileWriterField({ provider: 'OLLAMA', model: 'gemma4:31b' })).toEqual({
      fileWriter: { provider: 'OLLAMA', model: 'gemma4:31b' },
    });
    expect(fileWriterField(null)).toEqual({});
  });
});
