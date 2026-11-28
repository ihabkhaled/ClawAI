import { ParameterCountOrigin } from '../../../common/enums';
import {
  PUBLISHED_PARAMETER_COUNT_INDEX,
  PUBLISHED_PARAMETER_COUNT_RULES,
} from '../constants/model-parameter-count.constants';
import {
  lookupPublishedParameterCount,
  normaliseModelKey,
  parseNamedParameterCount,
  parseParameterCountText,
  resolveParameterCount,
} from '../utilities/model-parameter-count.utility';

describe('normaliseModelKey', () => {
  it('lower-cases and drops the org or models/ prefix but keeps the tag', () => {
    expect(normaliseModelKey('Meta-Llama/Llama-3.3-70B-Instruct')).toBe('llama-3.3-70b-instruct');
    expect(normaliseModelKey('models/gemini-2.5-pro')).toBe('gemini-2.5-pro');
    expect(normaliseModelKey('kimi-k2:1t-cloud')).toBe('kimi-k2:1t-cloud');
  });
});

describe('parseParameterCountText (what a local runtime reports)', () => {
  it.each([
    ['7.6B', 7.6, null],
    ['8B', 8, null],
    ['0.5B', 0.5, null],
    ['1T', 1000, null],
    ['134.52M', 0.135, null],
    ['671B (37B active)', 671, 37],
    ['1T (32B active)', 1000, 32],
    [' 70b ', 70, null],
  ])('reads %s as %s billion (active %s)', (text, total, active) => {
    expect(parseParameterCountText(text)).toEqual({ totalBillions: total, activeBillions: active });
  });

  it.each([null, undefined, '', 'unknown', '8B-Q4', '0B', '0', 'B', '-7B', '7 billion'])(
    'leaves %s empty rather than guessing',
    (text) => {
      expect(parseParameterCountText(text)).toBeNull();
    },
  );

  it('drops an active share that is not smaller than the total', () => {
    expect(parseParameterCountText('7B (9B active)')).toEqual({
      totalBillions: 7,
      activeBillions: null,
    });
  });

  it('rejects a count beyond the column limit', () => {
    expect(parseParameterCountText('900T')).toBeNull();
  });
});

describe('parseNamedParameterCount (the maker names the size)', () => {
  it.each([
    ['meta-llama/llama-3.3-70b-instruct', 70, null],
    ['llama-3.1-8b-instruct', 8, null],
    ['google/gemma-3-27b-it', 27, null],
    ['qwen/qwen3-235b-a22b-2507', 235, 22],
    ['qwen/qwen3.8-2.4t-a95b', 2400, 95],
    ['qwen/qwen3.5-397b-a17b', 397, 17],
    ['nvidia/nemotron-3-super-120b-a12b', 120, 12],
    ['qwen3-coder:480b-cloud', 480, null],
    ['mistralai/ministral-14b-2512', 14, null],
    ['nousresearch/hermes-4-405b', 405, null],
    ['deepseek-r1-distill-llama-70b', 70, null],
    ['llama-3.2-1b-instruct', 1, null],
    ['qwen3:0.6b', 0.6, null],
    ['google/gemma-4-26b-a4b-it:free', 26, 4],
  ])('reads %s as %s billion (active %s)', (key, total, active) => {
    expect(parseNamedParameterCount(key)).toEqual({ totalBillions: total, activeBillions: active });
  });

  it.each([
    'gpt-4o',
    'openai/gpt-5.4',
    'claude-sonnet-5',
    'models/gemini-2.5-pro',
    'grok-4',
    'o3-mini',
    'qwen/qwen3.5-plus-20260420',
    'qwen/qwen3.6-flash',
    'nvidia/nemotron-3.5-lightning',
    'mistralai/mistral-medium-3',
    'gemma-3n-e4b-it',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'mixtral-8x7b-instruct',
    'qwen2.5-7b-instruct-70b-mix',
  ])('never reads a size out of %s', (key) => {
    expect(parseNamedParameterCount(key)).toBeNull();
  });

  it('is not fooled by a version number that looks like a size', () => {
    expect(parseNamedParameterCount('qwen3.5-9b')).toEqual({
      totalBillions: 9,
      activeBillions: null,
    });
    expect(parseNamedParameterCount('llama-3.1-nemotron-ultra-253b-v1')).toEqual({
      totalBillions: 253,
      activeBillions: null,
    });
  });
});

describe('lookupPublishedParameterCount (maker pages)', () => {
  it.each([
    ['deepseek/deepseek-v3.1', 671, 37],
    ['deepseek-r1', 671, 37],
    ['deepseek-v3.1:671b-cloud', 671, 37],
    ['moonshotai/kimi-k2', 1000, 32],
    ['kimi-k2:1t-cloud', 1000, 32],
    ['moonshotai/kimi-k2-0905', 1000, 32],
    ['moonshotai/kimi-k2-thinking', 1000, 32],
    ['moonshotai/kimi-k2.5', 1000, 32],
    ['z-ai/glm-4.5', 355, 32],
    ['z-ai/glm-4.5-air', 106, 12],
    ['glm-4.6:cloud', 355, 32],
    ['openai/gpt-oss-120b', 117, 5.1],
    ['gpt-oss:120b-cloud', 117, 5.1],
    ['openai/gpt-oss-20b', 21, 3.6],
    ['meta-llama/llama-4-scout', 109, 17],
    ['meta-llama/llama-4-scout-17b-16e-instruct', 109, 17],
    ['meta-llama/llama-4-maverick', 400, 17],
    ['mistralai/mixtral-8x7b-instruct-v0.1', 46.7, 12.9],
    ['mistralai/mixtral-8x22b-instruct', 141, 39],
    ['minimax/minimax-m1', 456, 45.9],
    ['minimax/minimax-m2', 230, 10],
    ['microsoft/phi-4', 14, null],
    ['cohere/command-r7b-12-2024', 7, null],
    ['qwen3-coder:480b-cloud', 480, 35],
  ])('%s is %s billion (active %s)', (key, total, active) => {
    expect(lookupPublishedParameterCount(key)).toMatchObject({
      totalBillions: total,
      activeBillions: active,
    });
  });

  it('tells a rule from a name-stated count', () => {
    expect(lookupPublishedParameterCount('openai/gpt-oss-120b')?.origin).toBe(
      ParameterCountOrigin.PUBLISHED_RULE,
    );
    expect(lookupPublishedParameterCount('google/gemma-3-27b-it')?.origin).toBe(
      ParameterCountOrigin.MODEL_NAME,
    );
  });

  // The maker's card states no count for these, so a sibling is never assumed.
  it.each([
    'deepseek/deepseek-v3.2',
    'deepseek/deepseek-chat-v3-0324',
    'deepseek/deepseek-v3.1-terminus',
    'deepseek/deepseek-r1-0528',
    'z-ai/glm-4.7',
    'minimax/minimax-m2.1',
    'qwen3-coder',
    'deepseek/deepseek-v4-pro',
  ])('leaves %s unknown', (key) => {
    expect(lookupPublishedParameterCount(key)).toBeNull();
  });

  it.each([
    'gpt-4o',
    'gpt-5.4',
    'o4-mini',
    'claude-opus-5',
    'claude-haiku-4.5',
    'models/gemini-2.5-pro',
    'gemini-3.6-flash',
    'grok-4',
    'mistral-medium-3-5',
    'command-a-plus',
  ])('publishes no count for the closed model %s', (key) => {
    expect(lookupPublishedParameterCount(key)).toBeNull();
  });

  it('lists every key under exactly one rule, in normalised form, with no :latest', () => {
    const keys = PUBLISHED_PARAMETER_COUNT_RULES.flatMap((rule) => [...rule.keys]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(PUBLISHED_PARAMETER_COUNT_INDEX.size).toBe(keys.length);
    for (const key of keys) {
      expect(normaliseModelKey(key)).toBe(key);
      expect(key).not.toMatch(/:latest$/);
    }
  });

  it('keeps every rule sourced from the maker and sane', () => {
    for (const rule of PUBLISHED_PARAMETER_COUNT_RULES) {
      expect(rule.source).toMatch(
        /^https:\/\/(huggingface\.co|ai\.meta\.com|mistral\.ai|github\.com)\//,
      );
      expect(rule.totalBillions).toBeGreaterThan(0);
      if (rule.activeBillions !== undefined) {
        expect(rule.activeBillions).toBeLessThan(rule.totalBillions);
      }
    }
  });
});

describe('resolveParameterCount precedence', () => {
  it('trusts the runtime report over a table', () => {
    expect(resolveParameterCount({ modelKey: 'qwen3:8b', runtimeText: '8.2B' })).toEqual({
      totalBillions: 8.2,
      activeBillions: null,
      origin: ParameterCountOrigin.RUNTIME,
    });
  });

  it('falls back to the published rules when the runtime says nothing', () => {
    expect(
      resolveParameterCount({ modelKey: 'gpt-oss:120b-cloud', runtimeText: 'garbage' }),
    ).toMatchObject({
      totalBillions: 117,
      origin: ParameterCountOrigin.PUBLISHED_RULE,
    });
  });

  it('is null for a closed model with no runtime text', () => {
    expect(resolveParameterCount({ modelKey: 'gpt-5.4' })).toBeNull();
  });
});
