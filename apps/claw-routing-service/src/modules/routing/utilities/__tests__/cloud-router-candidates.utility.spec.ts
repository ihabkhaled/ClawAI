import { describe, expect, it } from 'vitest';
import { RouterProvider } from '../../../../generated/prisma';
import { modelMatchKey, selectCloudRouterCandidates } from '../cloud-router-candidates.utility';

const row = (
  id: string,
  provider: RouterProvider,
  model: string,
  state = 'REQUIRES_VALIDATION',
) => ({
  id,
  provider,
  providerModelId: model,
  activationState: state,
});

describe('modelMatchKey', () => {
  it.each([
    ['GEMINI', 'models/gemini-3.6-flash', 'GEMINI/gemini-3.6-flash'],
    ['gemini', 'gemini-3.6-flash', 'GEMINI/gemini-3.6-flash'],
    ['OLLAMA', 'glm-5.2:cloud', 'OLLAMA/glm-5.2'],
    ['OPENAI', ' GPT-5.5 ', 'OPENAI/gpt-5.5'],
  ])('%s + %s -> %s', (provider, model, expected) => {
    expect(modelMatchKey(provider, model)).toBe(expected);
  });
});

describe('selectCloudRouterCandidates', () => {
  const unfiltered = { allowed: null, connectorHealth: {} };

  // 20 Gemini models must not crowd out the other providers.
  it('takes one model per provider in turn up to the cap', () => {
    const rows = [
      ...Array.from({ length: 20 }, (_, i) =>
        row(`g${String(i)}`, RouterProvider.GEMINI, `gemini-${String(i)}`),
      ),
      row('a1', RouterProvider.ANTHROPIC, 'claude-sonnet-5'),
      row('o1', RouterProvider.OPENAI, 'gpt-5.5'),
    ];
    const exposed = new Set(rows.map((r) => modelMatchKey(r.provider, r.providerModelId)));

    const result = selectCloudRouterCandidates(rows, { ...unfiltered, exposed, max: 3 });

    expect(result.map((r) => r.provider).sort()).toEqual(['ANTHROPIC', 'GEMINI', 'OPENAI']);
  });

  it('puts proven (ACTIVE) models before unvalidated ones of the same provider', () => {
    const rows = [
      row('new', RouterProvider.GEMINI, 'gemini-a'),
      row('proven', RouterProvider.GEMINI, 'gemini-b', 'ACTIVE'),
    ];
    const exposed = new Set(rows.map((r) => modelMatchKey(r.provider, r.providerModelId)));

    const result = selectCloudRouterCandidates(rows, { ...unfiltered, exposed, max: 1 });

    expect(result[0]?.id).toBe('proven');
  });

  it('matches a plan key written with the Gemini models/ prefix', () => {
    const rows = [row('g', RouterProvider.GEMINI, 'gemini-3.6-flash')];
    const exposed = new Set(['GEMINI/gemini-3.6-flash']);

    const result = selectCloudRouterCandidates(rows, {
      exposed,
      allowed: new Set([modelMatchKey('GEMINI', 'models/gemini-3.6-flash')]),
      connectorHealth: {},
      max: 5,
    });

    expect(result).toHaveLength(1);
  });

  it('treats an unknown connector health as usable', () => {
    const rows = [row('a', RouterProvider.ANTHROPIC, 'claude-sonnet-5')];
    const exposed = new Set(['ANTHROPIC/claude-sonnet-5']);

    expect(
      selectCloudRouterCandidates(rows, { exposed, allowed: null, connectorHealth: {}, max: 5 }),
    ).toHaveLength(1);
  });
});
