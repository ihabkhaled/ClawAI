'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ROUTES } from '@/constants';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import type { UsePasswordRotationGuardReturn } from '@/types';

/**
 * Holds an account on the settings page until the required password change is done.
 *
 * `mustChangePassword` has existed on the user row and on the profile payload
 * for a long time and nothing ever read it, so an administrator-issued password
 * — one the administrator knows — quietly became the account's standing
 * credential. The flag only means something once something enforces it.
 *
 * The redirect targets settings rather than a dedicated screen because the
 * change-password form already lives there; a second screen would be a second
 * place to keep the password policy in step.
 */
export function usePasswordRotationGuard(): UsePasswordRotationGuardReturn {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const mustRotate = user?.mustChangePassword === true;

  useEffect(() => {
    // Locale-prefixed paths mean an equality check would never match, and
    // sending someone who is already on settings back to settings would loop.
    if (mustRotate && !pathname.endsWith(ROUTES.SETTINGS)) {
      router.replace(ROUTES.SETTINGS);
    }
  }, [mustRotate, pathname, router]);

  return { mustRotate };
}
