import { Injectable, Logger } from '@nestjs/common';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { InvokeErrorCode } from '../../../common/enums/invoke-error-code.enum';
import { InvokeOutcome } from '../../../common/enums/invoke-outcome.enum';
import { McpFailureKind } from '../../../common/enums/mcp-failure-kind.enum';
import { RuntimeKind } from '../../../common/enums/runtime-kind.enum';
import { TargetKind } from '../../../common/enums/target-kind.enum';
import { CredentialCryptoManager } from '../../installs/managers/credential-crypto.manager';
import { type McpFailure } from '../../mcp-servers/errors/mcp-failure.error';
import { McpClientManager } from '../../mcp-servers/managers/mcp-client.manager';
import { McpEndpointManager } from '../../mcp-servers/managers/mcp-endpoint.manager';
import { type McpEndpoint } from '../../mcp-servers/types/mcp-client.types';
import { buildCredentialHeaders } from '../../mcp-servers/utilities/credential-header.utility';
import { mcpFailureFromEgress } from '../../mcp-servers/utilities/mcp-failure-from-egress.utility';
import {
  type CatalogTarget,
  type ExecutionContext,
  type ExecutionResult,
  type ServerTarget,
} from '../types/invoke.types';

/**
 * Calls a tool on a remote MCP server: either one of the user's own servers or a curated catalog
 * entry. The credential is opened here for this one request and attached only to that server's URL.
 * Whatever the server answers is untrusted text; whatever goes wrong reads as one of a few generic
 * messages, so the answer never says what is or is not reachable from our network.
 */
@Injectable()
export class McpExecutorManager {
  private readonly logger = new Logger(McpExecutorManager.name);

  constructor(
    private readonly client: McpClientManager,
    private readonly endpoints: McpEndpointManager,
    private readonly crypto: CredentialCryptoManager,
  ) {}

  async execute(
    target: CatalogTarget | ServerTarget,
    args: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    const endpoint = await this.endpointFor(target, context.userId);
    if (endpoint === null) {
      return this.fail(
        InvokeOutcome.BLOCKED,
        InvokeErrorCode.CREDENTIAL_UNREADABLE,
        'The credential for this server is missing.',
        false,
      );
    }
    try {
      const result = await this.client.callTool(endpoint, {
        remoteName: target.kind === TargetKind.SERVER ? target.remoteName : target.toolName,
        args,
        timeoutMs: context.timeoutMs,
        maxResultBytes: context.maxResultBytes,
        signal: context.signal,
      });
      const note =
        result.droppedBlocks > 0
          ? `\n[${String(result.droppedBlocks)} non-text content block(s) omitted]`
          : '';
      return {
        outcome: result.isError ? InvokeOutcome.ERROR : InvokeOutcome.OK,
        text: `${result.text}${note}`,
        errorCode: result.isError ? InvokeErrorCode.TOOL_FAILED : null,
        serverFault: false,
        truncated: false,
      };
    } catch (error) {
      return this.fromFailure(mcpFailureFromEgress(error), target);
    }
  }

  private fromFailure(failure: McpFailure, target: CatalogTarget | ServerTarget): ExecutionResult {
    this.logger.warn(`fromFailure: ${target.slug} ${failure.kind} ${failure.detail}`);
    switch (failure.kind) {
      case McpFailureKind.TIMEOUT:
        return this.fail(
          InvokeOutcome.TIMEOUT,
          InvokeErrorCode.TIMED_OUT,
          'The server took too long to answer.',
          true,
        );
      case McpFailureKind.ABORTED:
        return this.fail(
          InvokeOutcome.ERROR,
          InvokeErrorCode.ABORTED,
          'The call was cancelled.',
          false,
        );
      case McpFailureKind.OVERSIZED:
        return this.fail(
          InvokeOutcome.ERROR,
          InvokeErrorCode.RESULT_TOO_LARGE,
          'The server answered with more data than allowed.',
          false,
        );
      case McpFailureKind.REJECTED:
        return this.fail(
          InvokeOutcome.ERROR,
          InvokeErrorCode.TOOL_FAILED,
          'The server answered in a way that could not be used.',
          true,
        );
      default:
        return this.fail(
          InvokeOutcome.ERROR,
          InvokeErrorCode.TOOL_FAILED,
          'The server could not be reached.',
          true,
        );
    }
  }

  private async endpointFor(
    target: CatalogTarget | ServerTarget,
    userId: string,
  ): Promise<McpEndpoint | null> {
    if (target.kind === TargetKind.SERVER) {
      return this.endpoints.forServer({
        id: target.serverId ?? '',
        ownerUserId: target.ownerUserId,
        url: target.url,
        authKind: target.authKind,
      });
    }
    const runtime = target.manifest.runtime;
    if (runtime.kind !== RuntimeKind.MCP_REMOTE) return null;
    if (target.manifest.auth.kind === AuthKind.NONE) {
      return { url: runtime.server.url, headers: {} };
    }
    const sealed = target.credential;
    const value =
      sealed === null || target.installId === null
        ? null
        : this.crypto.open(sealed.ciphertext, userId, target.installId);
    if (sealed === null || value === null) return null;
    return {
      url: runtime.server.url,
      headers: buildCredentialHeaders(sealed.kind, sealed.headerName, value),
    };
  }

  private fail(
    outcome: InvokeOutcome,
    errorCode: InvokeErrorCode,
    text: string,
    serverFault: boolean,
  ): ExecutionResult {
    return { outcome, text, errorCode, serverFault, truncated: false };
  }
}
