import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlanLifecycleStatus } from '@/enums';
import { usePlanForm } from '@/hooks/plans/use-plan-form';
import type { PlanView } from '@/types';

const seedPlan = {
  id: 'pl1',
  name: 'Pro',
  slug: 'pro',
  description: 'Pro tier',
  priceMonthly: 19,
  priceYearly: 190,
  currency: 'USD',
  displayOrder: 2,
  isDefault: false,
  isActive: true,
  isPublic: true,
  isTrial: true,
  trialDurationDays: 30,
  lifecycleStatus: PlanLifecycleStatus.ACTIVE,
  replacementPlanId: null,
  retiredAt: null,
  dailyTokenQuota: 100000,
  monthlyTokenQuota: 2000000,
  maxChatsPerDay: 50,
  maxMessagesPerDay: 500,
  maxWorkspaceConnections: 10,
  maxContextPacks: 5,
  maxMemoryItems: 100,
  allowCompareMode: true,
  allowJudgeMode: false,
  allowResearchMode: true,
  allowCriticReview: false,
  allowWorkspaces: true,
  allowMemory: true,
  allowContextPacks: false,
  modelAccess: [],
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
} satisfies PlanView;

describe('usePlanForm', () => {
  it('starts from blank defaults when no initial plan', () => {
    const { result } = renderHook(() => usePlanForm(null));
    expect(result.current.state.name).toBe('');
    expect(result.current.fieldErrors).toEqual({});
  });

  it('seeds state from an initial plan, mapping nullables to strings', () => {
    const { result } = renderHook(() => usePlanForm(seedPlan));
    expect(result.current.state.name).toBe('Pro');
    expect(result.current.state.monthlyTokenQuota).toBe('2000000');
    expect(result.current.state.allowJudgeMode).toBe(false);
    expect(result.current.state.isTrial).toBe(true);
  });

  it('maps null numeric fields to empty strings when seeding', () => {
    const sparse = {
      ...seedPlan,
      monthlyTokenQuota: null,
      maxChatsPerDay: null,
    } satisfies PlanView;
    const { result } = renderHook(() => usePlanForm(sparse));
    expect(result.current.state.monthlyTokenQuota).toBe('');
    expect(result.current.state.maxChatsPerDay).toBe('');
  });

  it('setField updates a value and clears its existing field error', () => {
    const { result } = renderHook(() => usePlanForm(null));
    // Force a validation error first.
    act(() => {
      result.current.buildCreateRequest();
    });
    expect(result.current.fieldErrors.name).toBeDefined();
    act(() => {
      result.current.setField('name', 'starter');
    });
    expect(result.current.state.name).toBe('starter');
    expect(result.current.fieldErrors.name).toBeUndefined();
  });

  it('buildCreateRequest returns a payload for valid input', () => {
    const { result } = renderHook(() => usePlanForm(null));
    act(() => {
      result.current.setField('name', 'Starter');
      result.current.setField('slug', 'starter');
    });
    const payload = result.current.buildCreateRequest();
    expect(payload).not.toBeNull();
    expect(payload?.name).toBe('Starter');
    expect(payload?.slug).toBe('starter');
    expect(payload).toMatchObject({ isTrial: false, trialDurationDays: null });
  });

  it('serializes an enabled trial with the fixed 30-day duration', () => {
    const { result } = renderHook(() => usePlanForm(null));
    act(() => {
      result.current.setField('name', 'Trial');
      result.current.setField('slug', 'trial');
      result.current.setField('isTrial', true);
    });

    expect(result.current.buildCreateRequest()).toMatchObject({
      isTrial: true,
      trialDurationDays: 30,
    });
  });

  it('buildCreateRequest returns null and collects field errors for invalid input', () => {
    const { result } = renderHook(() => usePlanForm(null));
    let payload: ReturnType<typeof result.current.buildCreateRequest> = null;
    act(() => {
      payload = result.current.buildCreateRequest();
    });
    expect(payload).toBeNull();
    expect(result.current.fieldErrors.name).toBeDefined();
  });

  it('buildUpdateRequest returns a payload from a seeded plan', () => {
    const { result } = renderHook(() => usePlanForm(seedPlan));
    const payload = result.current.buildUpdateRequest();
    expect(payload).not.toBeNull();
    expect(payload?.name).toBe('Pro');
  });

  it('buildUpdateRequest returns null and collects errors for invalid input', () => {
    const { result } = renderHook(() => usePlanForm(seedPlan));
    act(() => {
      result.current.setField('name', '');
    });
    let payload: ReturnType<typeof result.current.buildUpdateRequest> = null;
    act(() => {
      payload = result.current.buildUpdateRequest();
    });
    expect(payload).toBeNull();
    expect(result.current.fieldErrors.name).toBeDefined();
  });

  it('omits the optional description when blank in the built payload', () => {
    const { result } = renderHook(() => usePlanForm(null));
    act(() => {
      result.current.setField('name', 'Starter');
      result.current.setField('slug', 'starter');
      result.current.setField('description', '');
    });
    const payload = result.current.buildCreateRequest();
    expect(payload?.description).toBeUndefined();
  });
});
