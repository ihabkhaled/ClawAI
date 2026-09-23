import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGpuBadge } from '@/hooks/layout/use-gpu-badge';

const useHardwareSnapshot = vi.fn();
let canView = false;

vi.mock('@/hooks/local-frontier/use-hardware-snapshot', () => ({
  useHardwareSnapshot: (enabled: boolean) => useHardwareSnapshot(enabled),
}));
vi.mock('@/hooks/auth/use-permissions', () => ({
  usePermissions: () => ({ can: () => canView }),
}));

describe('useGpuBadge', () => {
  beforeEach(() => {
    useHardwareSnapshot.mockReset();
    useHardwareSnapshot.mockReturnValue({ data: undefined });
  });

  // A normal user used to fetch the admin-only /llamacpp/hardware on every
  // page and see a 502/403 in the network tab for a badge they never see.
  it('does not fetch hardware for a user who cannot view the badge', () => {
    canView = false;

    renderHook(() => useGpuBadge());

    expect(useHardwareSnapshot).toHaveBeenCalledWith(false);
  });

  it('fetches hardware for a user who can view the badge', () => {
    canView = true;

    renderHook(() => useGpuBadge());

    expect(useHardwareSnapshot).toHaveBeenCalledWith(true);
  });
});
