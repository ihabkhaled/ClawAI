import { Injectable } from '@nestjs/common';
import { decryptWithAad, encryptWithAad } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { CURRENT_KEY_VERSION } from '../constants/installs.constants';
import { type SealedCredential } from '../types/install.types';
import { credentialAad } from '../utilities/credential-aad.utility';

/**
 * Seals and opens credentials with PLUGIN_ENCRYPTION_KEY (AES-256-GCM). `open` exists for the
 * invoke path only: it returns the plaintext to the code that is about to attach it to one
 * outbound request, and never to a response or a log line.
 */
@Injectable()
export class CredentialCryptoManager {
  seal(plaintext: string, userId: string, ownerId: string): SealedCredential {
    return {
      ciphertext: encryptWithAad(
        plaintext,
        AppConfig.get().PLUGIN_ENCRYPTION_KEY,
        credentialAad(userId, ownerId),
      ),
      keyVersion: CURRENT_KEY_VERSION,
    };
  }

  /** The plaintext, or null when the bytes do not open for this user and owner (wrong key, tampered, moved row). */
  open(ciphertext: string, userId: string, ownerId: string): string | null {
    try {
      return decryptWithAad(
        ciphertext,
        AppConfig.get().PLUGIN_ENCRYPTION_KEY,
        credentialAad(userId, ownerId),
      );
    } catch {
      return null;
    }
  }
}
