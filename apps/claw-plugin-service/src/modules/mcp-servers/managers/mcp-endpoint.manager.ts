import { Injectable } from '@nestjs/common';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { CredentialCryptoManager } from '../../installs/managers/credential-crypto.manager';
import { McpServerSecretsRepository } from '../repositories/mcp-server-secrets.repository';
import { type McpEndpoint } from '../types/mcp-client.types';
import { buildCredentialHeaders } from '../utilities/credential-header.utility';

/**
 * Builds the endpoint (URL plus credential headers) for a call to one user server. The
 * credential is opened here, for this one request, and attached only to that server's own URL.
 */
@Injectable()
export class McpEndpointManager {
  constructor(
    private readonly secrets: McpServerSecretsRepository,
    private readonly crypto: CredentialCryptoManager,
  ) {}

  /** Null when the server needs a credential that is missing or no longer opens. */
  async forServer(server: {
    id: string;
    ownerUserId: string;
    url: string;
    authKind: AuthKind;
  }): Promise<McpEndpoint | null> {
    if (server.authKind === AuthKind.NONE) return { url: server.url, headers: {} };
    const sealed = await this.secrets.findSealed(server.ownerUserId, server.id);
    if (sealed === null) return null;
    const value = this.crypto.open(sealed.ciphertext, server.ownerUserId, server.id);
    if (value === null) return null;
    return {
      url: server.url,
      headers: buildCredentialHeaders(sealed.kind, sealed.headerName, value),
    };
  }
}
