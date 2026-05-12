import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AiActionPolicyKind } from '@/enums/ai-action-policy-kind.enum';
import { RiskLabel } from '@/enums/risk-label.enum';
import { usePolicyForm } from '@/hooks/admin/use-policy-form';
import type { AiActionPolicy } from '@/types/ai-action-policy.types';

const samplePolicy: AiActionPolicy = {
  id: 'p1',
  name: 'deny-pii',
  kind: AiActionPolicyKind.DENY,
  description: 'Blocks PII',
  providerRegex: '.*',
  actionKindRegex: '.*',
  riskMaxLabel: RiskLabel.CRITICAL,
  riskMaxScore: 100,
  priority: 1000,
  requireReason: true,
  isActive: true,
  isSystemDefault: true,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

describe('usePolicyForm', () => {
  it('starts with empty defaults when no initial', () => {
    const { result } = renderHook(() => usePolicyForm(null));
    expect(result.current.state.name).toBe('');
    expect(result.current.state.kind).toBe(AiActionPolicyKind.ALLOW);
    expect(result.current.state.riskMaxLabel).toBe(RiskLabel.LOW);
    expect(result.current.state.isActive).toBe(true);
    expect(result.current.fieldErrors).toEqual({});
  });

  it('seeds from initial policy when provided', () => {
    const { result } = renderHook(() => usePolicyForm(samplePolicy));
    expect(result.current.state.name).toBe('deny-pii');
    expect(result.current.state.kind).toBe(AiActionPolicyKind.DENY);
    expect(result.current.state.riskMaxLabel).toBe(RiskLabel.CRITICAL);
    expect(result.current.state.riskMaxScore).toBe('100');
    expect(result.current.state.priority).toBe('1000');
  });

  it('setField updates state', () => {
    const { result } = renderHook(() => usePolicyForm(null));
    act(() => {
      result.current.setField('name', 'my-policy');
    });
    expect(result.current.state.name).toBe('my-policy');
  });

  it('buildCreateRequest returns payload for valid input', () => {
    const { result } = renderHook(() => usePolicyForm(null));
    act(() => {
      result.current.setField('name', 'my-policy');
    });
    let payload: ReturnType<typeof result.current.buildCreateRequest> = null;
    act(() => {
      payload = result.current.buildCreateRequest();
    });
    expect(payload).not.toBeNull();
    expect(payload?.name).toBe('my-policy');
    expect(payload?.kind).toBe(AiActionPolicyKind.ALLOW);
  });

  it('buildCreateRequest returns null and sets field errors for invalid input', () => {
    const { result } = renderHook(() => usePolicyForm(null));
    let payload: ReturnType<typeof result.current.buildCreateRequest> = null;
    act(() => {
      payload = result.current.buildCreateRequest();
    });
    expect(payload).toBeNull();
    expect(result.current.fieldErrors.name).toBeDefined();
  });

  it('rejects non-kebab-case names', () => {
    const { result } = renderHook(() => usePolicyForm(null));
    act(() => {
      result.current.setField('name', 'My Policy');
    });
    let payload: ReturnType<typeof result.current.buildCreateRequest> = null;
    act(() => {
      payload = result.current.buildCreateRequest();
    });
    expect(payload).toBeNull();
    expect(result.current.fieldErrors.name).toContain('kebab');
  });

  it('rejects riskMaxScore > 100', () => {
    const { result } = renderHook(() => usePolicyForm(null));
    act(() => {
      result.current.setField('name', 'valid-name');
      result.current.setField('riskMaxScore', '200');
    });
    let payload: ReturnType<typeof result.current.buildCreateRequest> = null;
    act(() => {
      payload = result.current.buildCreateRequest();
    });
    expect(payload).toBeNull();
    expect(result.current.fieldErrors.riskMaxScore).toBeDefined();
  });

  it('buildUpdateRequest omits the name field', () => {
    const { result } = renderHook(() => usePolicyForm(samplePolicy));
    let payload: ReturnType<typeof result.current.buildUpdateRequest> = null;
    act(() => {
      payload = result.current.buildUpdateRequest();
    });
    expect(payload).not.toBeNull();
    expect(payload).not.toHaveProperty('name');
    expect(payload?.kind).toBe(AiActionPolicyKind.DENY);
  });

  it('reset returns to seeded state when initial provided', () => {
    const { result } = renderHook(() => usePolicyForm(samplePolicy));
    act(() => {
      result.current.setField('riskMaxScore', '50');
    });
    expect(result.current.state.riskMaxScore).toBe('50');
    act(() => {
      result.current.reset();
    });
    expect(result.current.state.riskMaxScore).toBe('100');
  });
});
