import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { type PluginCredentialStatus } from '@claw/shared-types';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { PluginErrorCode } from '../../../common/enums/plugin-error-code.enum';
import { isAllowedAuthHeader } from '../../catalog/utilities/is-allowed-auth-header.utility';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { DEFAULT_CREDENTIAL_HEADER } from '../constants/installs.constants';
import { rethrowInstallGone } from '../utilities/rethrow-install-gone.utility';
import { type CredentialBody } from '../dto/install.dto';
import { CredentialCryptoManager } from '../managers/credential-crypto.manager';
import { InstallSecretsRepository } from '../repositories/install-secrets.repository';
import { PluginInstallsService } from './plugin-installs.service';

/**
 * Write-only credentials. Nothing here returns, logs or echoes the secret: the only things that
 * leave are `hasCredential`, the kind and the update time. The value is sealed before storage.
 */
@Injectable()
export class PluginCredentialsService {
  private readonly logger = new Logger(PluginCredentialsService.name);

  constructor(
    private readonly installs: PluginInstallsService,
    private readonly secrets: InstallSecretsRepository,
    private readonly crypto: CredentialCryptoManager,
  ) {}

  async put(
    userId: string,
    installId: string,
    body: CredentialBody,
  ): Promise<PluginCredentialStatus> {
    const install = await this.installs.requireOwned(installId, userId);
    const header = this.headerFor(install.version.manifest, body.headerName);
    const sealed = this.crypto.seal(body.value, userId, installId);
    const saved = await this.secrets
      .saveCredential({
        userId,
        installId,
        kind: AuthKind.API_KEY,
        headerName: header,
        ciphertext: sealed.ciphertext,
        keyVersion: sealed.keyVersion,
      })
      .catch(rethrowInstallGone);
    this.logger.log(`put: install=${installId} credential stored`);
    return { hasCredential: true, kind: saved.kind, updatedAt: saved.updatedAt.toISOString() };
  }

  async remove(userId: string, installId: string): Promise<void> {
    await this.installs.requireOwned(installId, userId);
    await this.secrets.deleteCredential(installId, userId);
    this.logger.log(`remove: install=${installId} credential removed`);
  }

  private headerFor(manifestJson: unknown, requested: string | undefined): string {
    const parsed = parsePluginManifest(manifestJson);
    const auth = parsed.ok ? parsed.manifest.auth : null;
    if (auth?.kind !== AuthKind.API_KEY) {
      throw new BadRequestException({
        message: 'This plugin does not take an API key',
        errorCode: PluginErrorCode.CREDENTIAL_NOT_SUPPORTED,
      });
    }
    const header = requested ?? auth.headerName ?? DEFAULT_CREDENTIAL_HEADER;
    if (!isAllowedAuthHeader(header)) {
      throw new BadRequestException({
        message: 'That header name cannot carry a credential',
        errorCode: PluginErrorCode.CREDENTIAL_HEADER_DENIED,
      });
    }
    return header;
  }
}
