import { Injectable } from '@nestjs/common';
import { encryptWithAad } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { CURRENT_KEY_VERSION } from '../constants/installs.constants';
import { type SealedCredential } from '../types/install.types';
import { credentialAad } from '../utilities/credential-aad.utility';

/** Seals credentials with PLUGIN_ENCRYPTION_KEY (AES-256-GCM). There is deliberately no read path yet. */
@Injectable()
export class CredentialCryptoManager {
  seal(plaintext: string, userId: string, installId: string): SealedCredential {
    return {
      ciphertext: encryptWithAad(
        plaintext,
        AppConfig.get().PLUGIN_ENCRYPTION_KEY,
        credentialAad(userId, installId),
      ),
      keyVersion: CURRENT_KEY_VERSION,
    };
  }
}
