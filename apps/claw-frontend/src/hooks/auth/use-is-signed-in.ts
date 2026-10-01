import { useSyncExternalStore } from 'react';

import { useAuthStore } from '@/stores/auth.store';

const subscribe = (listener: () => void): (() => void) => useAuthStore.subscribe(listener);

const readSignedIn = (): boolean => {
  const { isAuthenticated, accessToken } = useAuthStore.getState();
  return isAuthenticated && accessToken !== null;
};

// The server and the hydration pass always see "signed out", so a page that
// is rendered statically (the marketing tree) produces identical HTML for
// everyone. The persisted session is read from local storage only after
// hydration, and a render that happens later on the client reads it directly.
// No network call: the question is answered by the token the app already keeps.
export function useIsSignedIn(): boolean {
  return useSyncExternalStore(subscribe, readSignedIn, () => false);
}
