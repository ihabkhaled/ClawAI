import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { useAdminUserFilters } from '../use-admin-user-filters';

describe('useAdminUserFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useAdminUserFilters());

    expect(result.current.page).toBe(1);
    expect(result.current.search).toBe('');
    expect(result.current.roleFilter).toBe('');
    expect(result.current.statusFilter).toBe('');
    expect(result.current.planFilter).toBe('');
    expect(result.current.verificationFilter).toBe('');
  });

  it('updates role filter via setRoleFilter and resets page', () => {
    const { result } = renderHook(() => useAdminUserFilters());

    act(() => {
      result.current.setRoleFilter('ADMIN');
    });

    expect(result.current.roleFilter).toBe('ADMIN');
    expect(result.current.page).toBe(1);
  });

  it('updates status filter via setStatusFilter', () => {
    const { result } = renderHook(() => useAdminUserFilters());

    act(() => {
      result.current.setStatusFilter('SUSPENDED');
    });

    expect(result.current.statusFilter).toBe('SUSPENDED');
  });

  it('updates plan filter via setPlanFilter', () => {
    const { result } = renderHook(() => useAdminUserFilters());

    act(() => {
      result.current.setPlanFilter('PRO');
    });

    expect(result.current.planFilter).toBe('PRO');
  });

  it('updates verification filter via setVerificationFilter', () => {
    const { result } = renderHook(() => useAdminUserFilters());

    act(() => {
      result.current.setVerificationFilter('VERIFIED');
    });

    expect(result.current.verificationFilter).toBe('VERIFIED');
  });

  it('updates search filter via setSearch and resets page', () => {
    const { result } = renderHook(() => useAdminUserFilters());

    act(() => {
      result.current.setSearch('alice');
    });

    expect(result.current.search).toBe('alice');
    expect(result.current.page).toBe(1);
  });

  it('updates pagination via setPage', () => {
    const { result } = renderHook(() => useAdminUserFilters());

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.page).toBe(3);
  });
});
