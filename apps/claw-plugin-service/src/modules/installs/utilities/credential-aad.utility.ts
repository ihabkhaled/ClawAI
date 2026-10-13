import { CREDENTIAL_AAD_SEPARATOR } from '../constants/installs.constants';

/**
 * Additional authenticated data for a stored credential. It binds the ciphertext to its owner
 * and install, so a row copied to another user or install cannot be opened.
 */
export function credentialAad(userId: string, installId: string): string {
  return `${userId}${CREDENTIAL_AAD_SEPARATOR}${installId}`;
}
