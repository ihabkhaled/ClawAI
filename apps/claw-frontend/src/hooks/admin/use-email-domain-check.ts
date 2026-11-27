import { useQuery } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useCallback, useState } from 'react';

import { EMAIL_CHECK_STALE_MS } from '@/constants/admin-security-settings.constants';
import { signupProtectionRepository } from '@/repositories/admin/signup-protection.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseEmailDomainCheckReturn } from '@/types/admin-security-settings.types';
import { describeEmailCheckOutcome } from '@/utilities/signup-protection-status.utility';

/**
 * The "Check an address" box: what a sign-up with this address or domain would
 * get under the SAVED settings. Runs only on Check; checking the same value
 * again asks the server again instead of reusing the last answer.
 */
export function useEmailDomainCheck(): UseEmailDomainCheckReturn {
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState('');
  const query = useQuery({
    queryKey: queryKeys.admin.signupEmailCheck(checked),
    queryFn: () => signupProtectionRepository.checkEmail(checked),
    enabled: checked.length > 0,
    staleTime: EMAIL_CHECK_STALE_MS,
    // A 400 (neither an address nor a domain) cannot pass on a retry.
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { refetch } = query;

  const submit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const next = value.trim();
      if (next.length === 0) {
        return;
      }
      if (next === checked) {
        void refetch();
      } else {
        setChecked(next);
      }
    },
    [checked, refetch, value],
  );

  return {
    value,
    canSubmit: value.trim().length > 0,
    isChecking: query.isFetching,
    outcome: describeEmailCheckOutcome(query.data, query.error),
    setValue,
    submit,
  };
}
