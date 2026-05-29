import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRoleForm } from '@/hooks/roles/use-role-form';

describe('useRoleForm', () => {
  it('starts from empty defaults', () => {
    const { result } = renderHook(() => useRoleForm());
    expect(result.current.state.slug).toBe('');
    expect(result.current.state.name).toBe('');
    expect(result.current.state.isAssignable).toBe(true);
    expect(result.current.fieldErrors).toEqual({});
  });

  it('setField updates a value and clears its existing field error', () => {
    const { result } = renderHook(() => useRoleForm());
    act(() => {
      result.current.buildCreateRequest();
    });
    expect(result.current.fieldErrors.slug).toBeDefined();
    act(() => {
      result.current.setField('slug', 'editor');
    });
    expect(result.current.state.slug).toBe('editor');
    expect(result.current.fieldErrors.slug).toBeUndefined();
  });

  it('buildCreateRequest returns a payload for valid input', () => {
    const { result } = renderHook(() => useRoleForm());
    act(() => {
      result.current.setField('slug', 'editor');
      result.current.setField('name', 'Editor');
    });
    const payload = result.current.buildCreateRequest();
    expect(payload).not.toBeNull();
    expect(payload?.slug).toBe('editor');
    expect(payload?.name).toBe('Editor');
  });

  it('omits the description when blank', () => {
    const { result } = renderHook(() => useRoleForm());
    act(() => {
      result.current.setField('slug', 'editor');
      result.current.setField('name', 'Editor');
      result.current.setField('description', '');
    });
    const payload = result.current.buildCreateRequest();
    expect(payload?.description).toBeUndefined();
  });

  it('forwards a non-blank description', () => {
    const { result } = renderHook(() => useRoleForm());
    act(() => {
      result.current.setField('slug', 'editor');
      result.current.setField('name', 'Editor');
      result.current.setField('description', 'Can edit');
    });
    const payload = result.current.buildCreateRequest();
    expect(payload?.description).toBe('Can edit');
  });

  it('buildCreateRequest returns null and collects errors for invalid input', () => {
    const { result } = renderHook(() => useRoleForm());
    let payload: ReturnType<typeof result.current.buildCreateRequest> = null;
    act(() => {
      payload = result.current.buildCreateRequest();
    });
    expect(payload).toBeNull();
    expect(result.current.fieldErrors.slug).toBeDefined();
  });
});
