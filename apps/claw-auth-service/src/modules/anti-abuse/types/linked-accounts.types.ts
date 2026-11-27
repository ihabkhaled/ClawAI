import type { LinkedAccountReason } from '../enums/linked-account-reason.enum';

/** One account tied to the inspected one. Admin-only (ADMIN_USERS_MANAGE). */
export type LinkedAccountView = {
  id: string;
  email: string;
  status: string;
  bannedAt: string | null;
  createdAt: string;
  reasons: LinkedAccountReason[];
};

/** `GET /admin/users/:userId/linked-accounts`. */
export type LinkedAccountsView = {
  accounts: LinkedAccountView[];
};

/** The user columns the view reads. */
export type LinkedUserRow = {
  id: string;
  email: string;
  status: string;
  bannedAt: Date | null;
  createdAt: Date;
};

/** The inspected account's own device hashes and registration network. */
export type LinkingSignals = {
  fingerprintHashes: string[];
  deviceIdHashes: string[];
  registrationNetwork: string | null;
};
