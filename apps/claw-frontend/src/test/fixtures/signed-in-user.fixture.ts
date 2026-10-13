import { AUTH_INITIAL_STATE } from '@/constants';
import { UserAppearancePreference, UserLanguagePreference, UserRole } from '@/enums';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Puts a signed-in account in the auth store. The "always save automatically"
 * choice is stored per account (ADR-168), so a test that sets or reads the mode
 * needs someone to be signed in.
 */
export function signInTestUser(id = 'user-1'): void {
  useAuthStore.setState({
    isAuthenticated: true,
    accessToken: 'access',
    refreshToken: 'refresh',
    user: {
      id,
      email: `${id}@example.test`,
      username: id,
      role: UserRole.USER,
      mustChangePassword: false,
      languagePreference: UserLanguagePreference.EN,
      appearancePreference: UserAppearancePreference.SYSTEM,
    },
  });
}

export function signOutTestUser(): void {
  useAuthStore.setState(AUTH_INITIAL_STATE);
}
