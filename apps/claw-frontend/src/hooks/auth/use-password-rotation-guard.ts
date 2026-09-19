'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ROUTES } from '@/constants';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import type { UsePasswordRotationGuardReturn } from '@/types';

/**
 * Holds an account on the change-password page until the required change is done.
 *
 * `mustChangePassword` has existed on the user row and on the profile payload
 * for a long time and nothing ever read it, so an administrator-issued password
 * — one the administrator knows — quietly became the account's standing
 * credential. The flag only means something once something enforces it.
 *
 * It used to redirect to the whole settings page, where the form is one card
 * among many; users landed there and could not find what they were being asked
 * to do. It now targets a page holding only that form. The form itself is one
 * shared component (ChangePasswordCard), so there is still exactly one place
 * the password policy lives.
 *
 * The flag clears the moment the change succeeds (useChangePassword writes it
 * into the cached profile and the auth store), so this redirect stops without a
 * page reload. Before that, it kept bouncing the user back until they refreshed.
 */
export function usePasswordRotationGuard(): UsePasswordRotationGuardReturn {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const mustRotate = user?.mustChangePassword === true;

  useEffect(() => {
    // Locale-prefixed paths mean an equality check would never match, and
    // sending someone already on the page back to it would loop.
    if (mustRotate && !pathname.endsWith(ROUTES.CHANGE_PASSWORD)) {
      router.replace(ROUTES.CHANGE_PASSWORD);
    }
  }, [mustRotate, pathname, router]);

  return { mustRotate };
}
