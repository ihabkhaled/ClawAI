import type { UserProfile } from './user.types';

export type AuthStoreState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  /** "Remember me". false ends the session when the browser closes (ADR-106). */
  persistent: boolean;
};

/** The session fields every tab shares through storage. */
export type StoredSession = Omit<AuthStoreState, 'user'>;

export type AuthStoreActions = {
  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
    persistent: boolean;
  }) => void;
  setUser: (user: UserProfile) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  clearAuth: () => void;
};

export type SidebarStoreState = {
  isOpen: boolean;
};

export type SidebarStoreActions = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};
