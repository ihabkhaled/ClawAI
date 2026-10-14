import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { type PluginCredentialStatus } from '@claw/shared-types';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { McpErrorCode } from '../../../common/enums/mcp-error-code.enum';
import { ServerState } from '../../../common/enums/server-status.enum';
import { CredentialCryptoManager } from '../../installs/managers/credential-crypto.manager';
import { EgressError } from '../../egress/errors/egress.error';
import { EGRESS_ALLOWED_PORTS } from '../../egress/constants/egress.constants';
import { assertPublicUrl } from '../../egress/utilities/assert-public-url.utility';
import { RuntimeSettingsManager } from '../../runtime-settings/managers/runtime-settings.manager';
import { MCP_SLUG_HEX_LENGTH, MCP_SLUG_PREFIX, SERVERS_LIST_MAX } from '../constants/mcp.constants';
import {
  type RegisterServerBody,
  type ServerCredentialBody,
  type UpdateServerBody,
} from '../dto/mcp-server.dto';
import { McpClientManager } from '../managers/mcp-client.manager';
import { McpServerPlanGateManager } from '../managers/mcp-server-plan-gate.manager';
import { McpServerPresenterManager } from '../managers/mcp-server-presenter.manager';
import { McpServerToolPolicyManager } from '../managers/mcp-server-tool-policy.manager';
import { McpToolSnapshotManager } from '../managers/mcp-tool-snapshot.manager';
import { McpServerSecretsRepository } from '../repositories/mcp-server-secrets.repository';
import { McpServersRepository } from '../repositories/mcp-servers.repository';
import { type McpEndpoint } from '../types/mcp-client.types';
import { type ServerRecord } from '../types/mcp-server.types';
import {
  type McpServerDetailView,
  type McpServerRegisteredView,
  type McpServerView,
} from '../types/mcp-server-view.types';
import { type DiscoveredSnapshot } from '../types/mcp-tool-snapshot.types';
import {
  buildCredentialHeaders,
  resolveCredentialHeaderName,
} from '../utilities/credential-header.utility';
import { McpFailure } from '../errors/mcp-failure.error';
import { mcpFailureToException } from '../utilities/mcp-failure-exception.utility';

/**
 * A user's own remote MCP servers. Every lookup is `where { id, ownerUserId }` with the owner taken
 * from the JWT; another user's id answers 404 exactly like an id that never existed.
 */
@Injectable()
export class McpServersService {
  private readonly logger = new Logger(McpServersService.name);

  constructor(
    private readonly repository: McpServersRepository,
    private readonly secrets: McpServerSecretsRepository,
    private readonly crypto: CredentialCryptoManager,
    private readonly planGate: McpServerPlanGateManager,
    private readonly settings: RuntimeSettingsManager,
    private readonly client: McpClientManager,
    private readonly snapshots: McpToolSnapshotManager,
    private readonly toolPolicy: McpServerToolPolicyManager,
    private readonly presenter: McpServerPresenterManager,
  ) {}

  async register(userId: string, body: RegisterServerBody): Promise<McpServerRegisteredView> {
    const settings = await this.settings.load();
    if (!settings.userServersEnabled) {
      throw new ForbiddenException({
        message: 'Registering your own MCP servers is switched off',
        errorCode: McpErrorCode.SERVERS_DISABLED,
      });
    }
    const cap = await this.planGate.resolveServerCap(userId);
    await this.assertUnderCap(userId, cap);
    const url = this.checkedUrl(body.url);
    const credential = this.credentialFor(body);
    const snapshot = await this.discoverSnapshot({ url: url.href, headers: credential.headers });
    const id = randomUUID();
    const outcome = await this.repository.createWithinCap(
      {
        id,
        ownerUserId: userId,
        slug: `${MCP_SLUG_PREFIX}${id.replaceAll('-', '').slice(0, MCP_SLUG_HEX_LENGTH)}`,
        name: body.name,
        url: url.href,
        urlHost: url.hostname,
        authKind: body.authKind,
        status: settings.requireApproval ? ServerState.PENDING_APPROVAL : ServerState.APPROVED,
        serverInfo: snapshot.serverInfo,
        toolsHash: snapshot.toolsHash,
        tools: snapshot.tools,
        credential: this.sealed(userId, id, body, credential.headerName),
      },
      cap,
    );
    if (outcome.kind === 'DUPLICATE') throw this.alreadyRegistered();
    if (outcome.kind === 'LIMIT') throw this.limitReached(cap ?? 0, outcome.current);
    this.logger.log(
      `register: server=${id} host=${url.hostname} tools=${String(snapshot.tools.length)}`,
    );
    return {
      server: await this.detail(userId, id),
      skippedTools: snapshot.skipped,
      ignoredTools: snapshot.ignored,
    };
  }

  async list(userId: string): Promise<McpServerView[]> {
    const records = await this.repository.findAllOwned(userId, SERVERS_LIST_MAX);
    return records.map((record) => this.presenter.toView(record));
  }

  async get(userId: string, id: string): Promise<McpServerDetailView> {
    return this.presenter.toDetail(await this.requireOwned(userId, id));
  }

  async update(userId: string, id: string, body: UpdateServerBody): Promise<McpServerDetailView> {
    const record = await this.requireOwned(userId, id);
    const plans = this.toolPolicy.plan(record.tools, body.tools ?? []);
    const status = body.enabled === undefined ? undefined : this.nextStatus(record, body.enabled);
    if (body.name !== undefined || status !== undefined) {
      await this.repository.updateOwned(id, userId, {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(status === undefined ? {} : { status }),
      });
    }
    for (const { localName, update } of plans) {
      await this.repository.updateTool(id, userId, localName, update);
    }
    return this.detail(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!(await this.repository.deleteOwned(id, userId))) throw this.notFound();
    this.logger.log(`remove: server=${id}`);
  }

  async putCredential(
    userId: string,
    id: string,
    body: ServerCredentialBody,
  ): Promise<PluginCredentialStatus> {
    const record = await this.requireOwned(userId, id);
    if (record.authKind === AuthKind.NONE) {
      throw new BadRequestException({
        message: 'This server does not take a credential',
        errorCode: McpErrorCode.CREDENTIAL_NOT_SUPPORTED,
      });
    }
    const headerName = this.headerNameOrThrow(record.authKind, body.headerName);
    const sealed = this.crypto.seal(body.value, userId, id);
    const updatedAt = await this.secrets.save(userId, id, {
      kind: record.authKind,
      headerName,
      ...sealed,
    });
    this.logger.log(`putCredential: server=${id} credential stored`);
    return { hasCredential: true, kind: record.authKind, updatedAt: updatedAt.toISOString() };
  }

  async removeCredential(userId: string, id: string): Promise<void> {
    await this.requireOwned(userId, id);
    await this.secrets.delete(userId, id);
    this.logger.log(`removeCredential: server=${id} credential removed`);
  }

  /** The owner's server, or 404. Shared with the review service. */
  async requireOwned(userId: string, id: string): Promise<ServerRecord> {
    const record = await this.repository.findOwned(id, userId);
    if (record === null) throw this.notFound();
    return record;
  }

  async detail(userId: string, id: string): Promise<McpServerDetailView> {
    return this.presenter.toDetail(await this.requireOwned(userId, id));
  }

  /** Cheap pre-check so a user at the cap never makes us open a connection; the insert re-checks under a lock. */
  private async assertUnderCap(userId: string, cap: number | null): Promise<void> {
    if (cap === null) return;
    const current = await this.repository.countOwned(userId);
    if (current >= cap) throw this.limitReached(cap, current);
  }

  private checkedUrl(raw: string): URL {
    try {
      return assertPublicUrl(raw, { allowedPorts: EGRESS_ALLOWED_PORTS }).url;
    } catch (error) {
      if (!(error instanceof EgressError)) throw error;
      // The reason (scheme, port, private name ...) stays in the log; the user gets one answer.
      this.logger.warn(`checkedUrl: refused (${error.detail})`);
      throw new UnprocessableEntityException({
        message: 'That URL cannot be used for an MCP server',
        errorCode: McpErrorCode.URL_BLOCKED,
      });
    }
  }

  private credentialFor(body: RegisterServerBody): {
    headers: Record<string, string>;
    headerName: string;
  } {
    if (body.credential === undefined) return { headers: {}, headerName: '' };
    const headerName = this.headerNameOrThrow(body.authKind, body.credential.headerName);
    return {
      headerName,
      headers: buildCredentialHeaders(body.authKind, headerName, body.credential.value),
    };
  }

  private sealed(
    userId: string,
    serverId: string,
    body: RegisterServerBody,
    headerName: string,
  ): { kind: AuthKind; headerName: string; ciphertext: string; keyVersion: number } | undefined {
    if (body.credential === undefined) return undefined;
    return {
      kind: body.authKind,
      headerName,
      ...this.crypto.seal(body.credential.value, userId, serverId),
    };
  }

  private headerNameOrThrow(kind: AuthKind, requested: string | undefined): string {
    const name = resolveCredentialHeaderName(kind, requested);
    if (name === null) {
      throw new BadRequestException({
        message: 'That header name cannot carry a credential',
        errorCode: McpErrorCode.CREDENTIAL_HEADER_DENIED,
      });
    }
    return name;
  }

  private async discoverSnapshot(endpoint: McpEndpoint): Promise<DiscoveredSnapshot> {
    try {
      const discovery = await this.client.discover(endpoint);
      const snapshot = this.snapshots.build(discovery.rawTools);
      if (snapshot.tools.length === 0) {
        throw new UnprocessableEntityException({
          message: 'The server lists no tools ClawAI can use',
          errorCode: McpErrorCode.NO_USABLE_TOOLS,
        });
      }
      return { ...snapshot, serverInfo: discovery.serverInfo };
    } catch (error) {
      if (error instanceof McpFailure) {
        this.logger.warn(`discover: ${error.kind} ${error.detail}`);
        throw mcpFailureToException(error);
      }
      throw error;
    }
  }

  /** Only an approved server can be switched off, and only a switched-off one back on. */
  private nextStatus(record: ServerRecord, enabled: boolean): ServerState {
    const allowed = enabled
      ? record.status === ServerState.DISABLED
      : record.status === ServerState.APPROVED;
    if (!allowed) {
      throw new ConflictException({
        message: 'The server is not in a state where that change applies',
        errorCode: McpErrorCode.STATE_NOT_ALLOWED,
      });
    }
    return enabled ? ServerState.APPROVED : ServerState.DISABLED;
  }

  private alreadyRegistered(): ConflictException {
    return new ConflictException({
      message: 'You already registered this server URL',
      errorCode: McpErrorCode.SERVER_ALREADY_REGISTERED,
    });
  }

  private limitReached(limit: number, current: number): ForbiddenException {
    return new ForbiddenException({
      message: 'Your plan does not allow more MCP servers',
      errorCode: McpErrorCode.SERVER_LIMIT,
      limit,
      current,
    });
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      message: 'MCP server not found',
      errorCode: McpErrorCode.SERVER_NOT_FOUND,
    });
  }
}
