import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/constants';
import { usePasswordRotationGuard } from '@/hooks/auth/use-password-rotation-guard';

const replace = vi.fn();
let pathname = '/en/chat';
let mustChangePassword: boolean | undefined = true;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname,
}));

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ user: { mustChangePassword } }),
}));

describe('usePasswordRotationGuard', () => {
  beforeEach(() => {
    replace.mockReset();
    pathname = '/en/chat';
    mustChangePassword = true;
  });

  // It used to send users to the whole settings page, where the form is one
  // card among many and people could not find what they were asked to do.
  it('sends a forced rotation to the dedicated change-password page', () => {
    renderHook(() => usePasswordRotationGuard());
    expect(replace).toHaveBeenCalledWith(ROUTES.CHANGE_PASSWORD);
  });

  it('does not loop when already on that page, under any locale', () => {
    pathname = `/ar${ROUTES.CHANGE_PASSWORD}`;
    renderHook(() => usePasswordRotationGuard());
    expect(replace).not.toHaveBeenCalled();
  });

  it('leaves everyone else alone', () => {
    mustChangePassword = false;
    const { result } = renderHook(() => usePasswordRotationGuard());
    expect(replace).not.toHaveBeenCalled();
    expect(result.current.mustRotate).toBe(false);
  });
});
