import { useSearchParams } from 'next/navigation';

import { useLocalizedHref } from '@/hooks/common/use-localized-href';
import { safeReturnRoute } from '@/utilities/safe-return-route.utility';

/**
 * The link between the sign-in and sign-up screens: in the reader's language, and carrying the page
 * they came from (`returnTo`) so signing up instead of signing in still ends on that page.
 */
export function useAuthSwitchHref(path: string): string {
  const localise = useLocalizedHref();
  const returnTo = useSearchParams().get('returnTo');
  const keepsReturn = returnTo !== null && safeReturnRoute(returnTo) === returnTo;
  return localise(keepsReturn ? `${path}?returnTo=${encodeURIComponent(returnTo)}` : path);
}
