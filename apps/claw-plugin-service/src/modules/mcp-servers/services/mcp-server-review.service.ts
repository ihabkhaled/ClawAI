import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';

import { McpErrorCode } from '../../../common/enums/mcp-error-code.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { ServerState } from '../../../common/enums/server-status.enum';
import { McpFailure } from '../errors/mcp-failure.error';
import { type ApproveChangesBody } from '../dto/mcp-server.dto';
import { McpClientManager } from '../managers/mcp-client.manager';
import { McpEndpointManager } from '../managers/mcp-endpoint.manager';
import { McpToolSnapshotManager } from '../managers/mcp-tool-snapshot.manager';
import { McpServersRepository } from '../repositories/mcp-servers.repository';
import { type McpEndpoint } from '../types/mcp-client.types';
import { type ServerRecord, type SnapshotWrite } from '../types/mcp-server.types';
import {
  type McpServerDetailView,
  type McpServerRefreshView,
} from '../types/mcp-server-view.types';
import { type ToolSnapshot } from '../types/mcp-tool-snapshot.types';
import { diffToolSnapshots, isEmptyDiff } from '../utilities/diff-tool-snapshots.utility';
import {
  mcpFailureErrorCode,
  mcpFailureToException,
} from '../utilities/mcp-failure-exception.utility';
import { McpServersService } from './mcp-servers.service';

/**
 * Tool poisoning and rug-pulls: a server can change what its tools say, or which tools it has,
 * after the owner approved them. Refresh re-reads tools/list. A different list puts the server in
 * NEEDS_REVIEW (calls blocked) with the new list stored for review; only approving the exact
 * hash the owner saw puts it back to work.
 */
@Injectable()
export class McpServerReviewService {
  private readonly logger = new Logger(McpServerReviewService.name);

  constructor(
    private readonly servers: McpServersService,
    private readonly repository: McpServersRepository,
    private readonly endpoints: McpEndpointManager,
    private readonly client: McpClientManager,
    private readonly snapshots: McpToolSnapshotManager,
  ) {}

  async refresh(userId: string, id: string): Promise<McpServerRefreshView> {
    const record = await this.servers.requireOwned(userId, id);
    this.assertRefreshable(record);
    const snapshot = await this.fetchSnapshot(userId, record);
    if (snapshot.toolsHash === record.toolsHash) {
      await this.repository.markChecked(id, userId, null);
      return this.view(userId, id, false, null, snapshot);
    }
    const diff = diffToolSnapshots(record.tools, snapshot.tools);
    await this.repository.replaceSnapshot(id, userId, this.write(record, snapshot));
    this.logger.warn(`refresh: server=${id} tools changed, status=${this.nextStatus(record)}`);
    return this.view(userId, id, !isEmptyDiff(diff), diff, snapshot);
  }

  async approveChanges(
    userId: string,
    id: string,
    body: ApproveChangesBody,
  ): Promise<McpServerDetailView> {
    const record = await this.servers.requireOwned(userId, id);
    if (record.status !== ServerState.NEEDS_REVIEW) {
      throw new ConflictException({
        message: 'This server has no changes waiting for review',
        errorCode: McpErrorCode.NOT_AWAITING_REVIEW,
      });
    }
    if (record.toolsHash !== body.toolsHash) {
      throw new ConflictException({
        message: 'The tool list changed again; review it once more',
        errorCode: McpErrorCode.REVIEW_HASH_MISMATCH,
      });
    }
    await this.repository.updateOwned(id, userId, { status: ServerState.APPROVED });
    this.logger.log(`approveChanges: server=${id}`);
    return this.servers.detail(userId, id);
  }

  private assertRefreshable(record: ServerRecord): void {
    const refreshable =
      record.status === ServerState.APPROVED ||
      record.status === ServerState.NEEDS_REVIEW ||
      record.status === ServerState.PENDING_APPROVAL;
    if (!refreshable) {
      throw new ConflictException({
        message: 'The server is not in a state where that change applies',
        errorCode: McpErrorCode.STATE_NOT_ALLOWED,
      });
    }
  }

  private async fetchSnapshot(userId: string, record: ServerRecord): Promise<ToolSnapshot> {
    const endpoint = await this.endpoints.forServer(record);
    if (endpoint === null) {
      throw new BadRequestException({
        message: 'This server needs a credential before it can be refreshed',
        errorCode: McpErrorCode.CREDENTIAL_REQUIRED,
      });
    }
    const snapshot = await this.discover(userId, record, endpoint);
    if (snapshot.tools.length === 0) {
      await this.repository.markChecked(record.id, userId, McpErrorCode.NO_USABLE_TOOLS);
      throw new UnprocessableEntityException({
        message: 'The server lists no tools ClawAI can use',
        errorCode: McpErrorCode.NO_USABLE_TOOLS,
      });
    }
    return snapshot;
  }

  private async discover(
    userId: string,
    record: ServerRecord,
    endpoint: McpEndpoint,
  ): Promise<ToolSnapshot> {
    try {
      return this.snapshots.build((await this.client.discover(endpoint)).rawTools);
    } catch (error) {
      if (!(error instanceof McpFailure)) throw error;
      this.logger.warn(`refresh: server=${record.id} ${error.kind} ${error.detail}`);
      await this.repository.markChecked(record.id, userId, mcpFailureErrorCode(error));
      throw mcpFailureToException(error);
    }
  }

  /** Tools whose definition is unchanged keep the owner's settings; new or changed ones start as WRITE. */
  private write(record: ServerRecord, snapshot: ToolSnapshot): SnapshotWrite {
    const previous = new Map(record.tools.map((tool) => [tool.name, tool]));
    return {
      toolsHash: snapshot.toolsHash,
      serverInfo: null,
      status: this.nextStatus(record),
      tools: snapshot.tools.map((tool) => {
        const kept = previous.get(tool.name);
        const unchanged = kept?.schemaHash === tool.schemaHash ? kept : undefined;
        return {
          ...tool,
          riskLevel: unchanged?.riskLevel ?? RiskLevel.WRITE,
          enabled: unchanged?.enabled ?? true,
          consentGranted: unchanged?.consentGranted ?? false,
        };
      }),
    };
  }

  private nextStatus(record: ServerRecord): ServerState {
    return record.status === ServerState.PENDING_APPROVAL
      ? ServerState.PENDING_APPROVAL
      : ServerState.NEEDS_REVIEW;
  }

  private async view(
    userId: string,
    id: string,
    changed: boolean,
    diff: McpServerRefreshView['diff'],
    snapshot: ToolSnapshot,
  ): Promise<McpServerRefreshView> {
    return {
      changed,
      diff,
      server: await this.servers.detail(userId, id),
      skippedTools: snapshot.skipped,
      ignoredTools: snapshot.ignored,
    };
  }
}
