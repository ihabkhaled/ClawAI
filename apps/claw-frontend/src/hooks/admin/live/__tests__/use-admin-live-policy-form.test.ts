import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LiveModelChainDirection, LiveModelChainKind } from '@/enums/live-model-chain.enum';
import { useAdminLivePolicyForm } from '@/hooks/admin/live/use-admin-live-policy-form';
import type { LivePolicyFormResult, LivePolicyVersion } from '@/types/live-admin.types';

const gemma = { connector: 'OLLAMA', model: 'gemma4:31b', style: 'OLLAMA' };
const gemini = { connector: 'GEMINI', model: 'gemini-3.1-flash-lite', style: 'OPENAI_COMPAT' };
const deepseek = { connector: 'OLLAMA', model: 'deepseek-v4.1-flash', style: 'OLLAMA' };

const POLICY: LivePolicyVersion = {
  version: 4,
  active: true,
  note: null,
  createdBy: null,
  createdAt: '2026-11-26T10:00:00Z',
  config: {
    featureEnabled: true,
    killSwitch: false,
    plans: {},
    defaultPlan: { freeSecondsPerMonth: 0, paidMicroUsdPerMinute: 20_000 },
    visionBilling: 'ACTUAL_COST',
    graceSeconds: 60,
    maxActiveStreams: 20,
    maxSessionsPerUser: 3,
    sessionsPerUserPerHour: 30,
    dailyBudgetMicroUsd: 20_000_000,
    budgetSoftStopPercent: 80,
    summaryModelChain: [gemma, gemini],
    visionModelChain: [gemini],
    councilModelChain: [gemini],
  },
};

function setup() {
  const view = renderHook(() => useAdminLivePolicyForm(POLICY));
  const chain = (kind: LiveModelChainKind): unknown[] =>
    view.result.current.values?.modelChains[kind] ?? [];
  const build = (): LivePolicyFormResult | null => {
    let built: LivePolicyFormResult | null = null;
    act(() => {
      built = view.result.current.build();
    });
    return built;
  };
  return { view, chain, build, actions: () => view.result.current.chainActions };
}

describe('useAdminLivePolicyForm model chains', () => {
  it('picks, reorders and removes models, and the save carries them', () => {
    const { chain, build, actions } = setup();
    act(() =>
      actions().setChainModel(LiveModelChainKind.SUMMARY, 1, 'OLLAMA::deepseek-v4.1-flash'),
    );
    expect(chain(LiveModelChainKind.SUMMARY)).toEqual([gemma, deepseek]);
    act(() => actions().moveChainRow(LiveModelChainKind.SUMMARY, 1, LiveModelChainDirection.UP));
    expect(chain(LiveModelChainKind.SUMMARY)).toEqual([deepseek, gemma]);
    act(() => actions().removeChainRow(LiveModelChainKind.SUMMARY, 0));
    expect(chain(LiveModelChainKind.SUMMARY)).toEqual([gemma]);
    expect(build()).toMatchObject({ invalidField: null, config: { summaryModelChain: [gemma] } });
  });

  it('ignores a pick Live cannot call', () => {
    const { chain, actions } = setup();
    act(() => actions().setChainModel(LiveModelChainKind.VISION, 0, 'OPENAI::gpt-5'));
    expect(chain(LiveModelChainKind.VISION)).toEqual([gemini]);
  });

  it('keeps the council between 1 and 3 agents', () => {
    const { chain, build, actions } = setup();
    act(() => actions().removeChainRow(LiveModelChainKind.COUNCIL, 0));
    expect(chain(LiveModelChainKind.COUNCIL)).toHaveLength(1);
    for (let step = 0; step < 4; step += 1) {
      act(() => actions().addChainRow(LiveModelChainKind.COUNCIL));
    }
    expect(chain(LiveModelChainKind.COUNCIL)).toHaveLength(3);
    expect(build()).toMatchObject({ config: { councilModelChain: [gemini, gemini, gemini] } });
  });
});
