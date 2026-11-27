import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/repositories/shared/query-keys';
import type { InvalidateSecuritySettings } from '@/types/admin-security-settings.types';

/**
 * After any security.* write: reload the settings (so the form re-seeds), what
 * is in force (a saved key overrides the server's) and any address-check answer
 * (it reflects the saved settings). Shared by save and secret removal.
 */
export function useInvalidateSecuritySettings(): InvalidateSecuritySettings {
  const queryClient = useQueryClient();
  return useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.systemSettings });
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.signupProtectionStatus });
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.signupEmailChecks });
  }, [queryClient]);
}
