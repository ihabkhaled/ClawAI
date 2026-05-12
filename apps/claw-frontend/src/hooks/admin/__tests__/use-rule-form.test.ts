import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRuleForm } from '@/hooks/admin/use-rule-form';
import type { SuggestionTriggerRule } from '@/types/ai-action-policy.types';

const sampleRule: SuggestionTriggerRule = {
  id: 'r1',
  name: 'github-pr-opened',
  description: 'When a PR opens',
  eventType: 'workspace.webhook.received',
  providerRegex: '^GITHUB$',
  contentRegex: '"action"\\s*:\\s*"opened"',
  actionKindToSuggest: 'SUMMARIZE',
  isActive: true,
  isSystemDefault: true,
  priority: 500,
  perRuleBudgetPerHour: null,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
};

describe('useRuleForm', () => {
  it('starts with sensible defaults when no initial', () => {
    const { result } = renderHook(() => useRuleForm(null));
    expect(result.current.state.name).toBe('');
    expect(result.current.state.eventType).toBe('workspace.webhook.received');
    expect(result.current.state.actionKindToSuggest).toBe('SUMMARIZE');
    expect(result.current.state.isActive).toBe(true);
    expect(result.current.fieldErrors).toEqual({});
  });

  it('seeds from initial rule', () => {
    const { result } = renderHook(() => useRuleForm(sampleRule));
    expect(result.current.state.name).toBe('github-pr-opened');
    expect(result.current.state.providerRegex).toBe('^GITHUB$');
    expect(result.current.state.priority).toBe('500');
  });

  it('buildCreateRequest succeeds for valid input', () => {
    const { result } = renderHook(() => useRuleForm(null));
    act(() => {
      result.current.setField('name', 'custom-rule');
    });
    let payload: ReturnType<typeof result.current.buildCreateRequest> = null;
    act(() => {
      payload = result.current.buildCreateRequest();
    });
    expect(payload).not.toBeNull();
    expect(payload?.name).toBe('custom-rule');
    expect(payload?.actionKindToSuggest).toBe('SUMMARIZE');
  });

  it('rejects empty name', () => {
    const { result } = renderHook(() => useRuleForm(null));
    let payload: ReturnType<typeof result.current.buildCreateRequest> = null;
    act(() => {
      payload = result.current.buildCreateRequest();
    });
    expect(payload).toBeNull();
    expect(result.current.fieldErrors.name).toBeDefined();
  });

  it('omits name in update payload', () => {
    const { result } = renderHook(() => useRuleForm(sampleRule));
    let payload: ReturnType<typeof result.current.buildUpdateRequest> = null;
    act(() => {
      payload = result.current.buildUpdateRequest();
    });
    expect(payload).not.toBeNull();
    expect(payload).not.toHaveProperty('name');
    expect(payload?.priority).toBe(500);
  });

  it('rejects priority > 10000', () => {
    const { result } = renderHook(() => useRuleForm(null));
    act(() => {
      result.current.setField('name', 'valid-name');
      result.current.setField('priority', '99999');
    });
    let payload: ReturnType<typeof result.current.buildCreateRequest> = null;
    act(() => {
      payload = result.current.buildCreateRequest();
    });
    expect(payload).toBeNull();
    expect(result.current.fieldErrors.priority).toBeDefined();
  });

  it('reset returns to seeded state', () => {
    const { result } = renderHook(() => useRuleForm(sampleRule));
    act(() => {
      result.current.setField('priority', '100');
    });
    expect(result.current.state.priority).toBe('100');
    act(() => {
      result.current.reset();
    });
    expect(result.current.state.priority).toBe('500');
  });
});
