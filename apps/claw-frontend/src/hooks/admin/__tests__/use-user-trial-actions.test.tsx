import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUserTrialActions } from '@/hooks/admin/use-user-trial-actions';
import { plansRepository } from '@/repositories/admin/plans.repository';
import type { PlanView } from '@/types/plan.types';
import { showToast } from '@/utilities/toast.utility';

vi.mock('@/repositories/admin/plans.repository');
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/utilities/toast.utility', () => ({
  showToast: { success: vi.fn(), apiError: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const freePlan = { id: 'plan-free', name: 'Free', isTrial: true, isActive: true, isDefault: true };

describe('useUserTrialActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(plansRepository.list).mockResolvedValue([freePlan as unknown as PlanView]);
  });

  it('names the free plan once the plan list loads', async () => {
    const { result } = renderHook(() => useUserTrialActions('u1'), { wrapper });
    await waitFor(() => expect(result.current.freePlanName).toBe('Free'));
  });

  it('does not call the server until the form has valid days and a reason', async () => {
    const { result } = renderHook(() => useUserTrialActions('u1'), { wrapper });
    act(() => {
      result.current.addDays.setDays('0');
      result.current.addDays.setReason('Support');
    });
    act(() => {
      result.current.addDays.submit();
    });
    expect(plansRepository.addTrialDays).not.toHaveBeenCalled();
    expect(result.current.addDays.errorKey).toBe('admin.assignPlanDurationDaysInvalid');

    act(() => {
      result.current.addDays.setDays('45');
      result.current.addDays.setReason('   ');
    });
    act(() => {
      result.current.addDays.submit();
    });
    expect(plansRepository.addTrialDays).not.toHaveBeenCalled();
    expect(result.current.addDays.errorKey).toBe('admin.assignPlanReasonRequired');
  });

  it('adds trial days with a trimmed reason and reports the remaining days', async () => {
    vi.mocked(plansRepository.addTrialDays).mockResolvedValue({
      userId: 'u1',
      expiresAt: '2027-01-01T00:00:00.000Z',
      daysRemaining: 95,
    });
    const { result } = renderHook(() => useUserTrialActions('u1'), { wrapper });
    act(() => {
      result.current.addDays.setDays('90');
      result.current.addDays.setReason('  Goodwill  ');
    });
    act(() => {
      result.current.addDays.submit();
    });
    await waitFor(() =>
      expect(plansRepository.addTrialDays).toHaveBeenCalledWith('u1', 90, 'Goodwill'),
    );
    await waitFor(() =>
      expect(showToast.success).toHaveBeenCalledWith({ description: 'admin.addTrialDaysSuccess' }),
    );
  });

  it('sets the user to the free plan for N days using the plan it found', async () => {
    vi.mocked(plansRepository.assignUserForDays).mockResolvedValue(freePlan as unknown as PlanView);
    const { result } = renderHook(() => useUserTrialActions('u1'), { wrapper });
    await waitFor(() => expect(result.current.freePlanName).toBe('Free'));
    act(() => {
      result.current.setFree.setDays('365');
      result.current.setFree.setReason('Reopen');
    });
    act(() => {
      result.current.setFree.submit();
    });
    await waitFor(() =>
      expect(plansRepository.assignUserForDays).toHaveBeenCalledWith(
        'u1',
        'plan-free',
        365,
        'Reopen',
      ),
    );
  });

  it('shows the server refusal through the translated error toast', async () => {
    const failure = new Error('refused');
    vi.mocked(plansRepository.addTrialDays).mockRejectedValue(failure);
    const { result } = renderHook(() => useUserTrialActions('u1'), { wrapper });
    act(() => {
      result.current.addDays.setReason('x');
    });
    act(() => {
      result.current.addDays.submit();
    });
    await waitFor(() =>
      expect(showToast.apiError).toHaveBeenCalledWith(failure, 'admin.addTrialDaysFailed', {
        translate: expect.any(Function),
      }),
    );
  });
});
