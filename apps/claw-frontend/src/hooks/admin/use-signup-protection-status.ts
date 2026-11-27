import { useQuery } from '@tanstack/react-query';

import { signupProtectionRepository } from '@/repositories/admin/signup-protection.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseSignupProtectionStatusReturn } from '@/types/admin-security-settings.types';

/**
 * What is really in force on sign-up: each captcha provider's state and where
 * its keys come from (this page or the server environment), and the built-in
 * throwaway-list size. The settings rows alone cannot say this, because the
 * production keys live in the server environment. Invalidated on every save.
 */
export function useSignupProtectionStatus(): UseSignupProtectionStatusReturn {
  const query = useQuery({
    queryKey: queryKeys.admin.signupProtectionStatus,
    queryFn: () => signupProtectionRepository.getStatus(),
  });
  return { status: query.data, isError: query.isError };
}
