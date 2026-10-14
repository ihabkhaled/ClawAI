import { usePathname, useSearchParams } from 'next/navigation';

import {
  guestRegisterHref,
  guestReturnTarget,
  guestSignInHref,
} from '@/utilities/thread-board-guest.utility';

/** Sign-in and sign-up links that return the guest to the Board view they are looking at. */
export function useBoardGuestLinks(): { signInHref: string; registerHref: string } {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const target = guestReturnTarget(pathname, search);
  return { signInHref: guestSignInHref(target), registerHref: guestRegisterHref(target) };
}
