import type { SearchProvider } from '../../../generated/prisma';

/** Shape returned to clients — never echoes the encrypted secret blob. */
export type SanitizedSearchProvider = Omit<SearchProvider, 'encryptedSecret' | 'secretVersion'> & {
  hasSecret: boolean;
  secretVersion: number;
};
