import { Injectable } from '@nestjs/common';

import { toJsonValue } from '../../../common/utilities/to-json-value.utility';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { SERVER_SELECT } from '../constants/server-query.constants';
import {
  type CreateServerInput,
  type CreateServerOutcome,
  type ServerRecord,
  type SnapshotWrite,
  type ToolUpdate,
} from '../types/mcp-server.types';
import { mapServerRow } from '../utilities/map-server-row.utility';

/** Every query is scoped by the owner id from the JWT; another user's server is indistinguishable from none. */
@Injectable()
export class McpServersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOwned(id: string, userId: string): Promise<ServerRecord | null> {
    const row = await this.prisma.mcpServer.findFirst({
      where: { id, ownerUserId: userId },
      select: SERVER_SELECT,
    });
    return row === null ? null : mapServerRow(row);
  }

  countOwned(userId: string): Promise<number> {
    return this.prisma.mcpServer.count({ where: { ownerUserId: userId } });
  }

  async findAllOwned(userId: string, limit: number): Promise<ServerRecord[]> {
    const rows = await this.prisma.mcpServer.findMany({
      where: { ownerUserId: userId },
      select: SERVER_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
    });
    return rows.map(mapServerRow);
  }

  /**
   * Creates the server (tools and credential with it) unless the user has it already or is at the
   * plan cap. The count and the insert share one transaction behind a per-user advisory lock, so two
   * parallel registrations cannot both slip under the cap.
   */
  async createWithinCap(
    input: CreateServerInput,
    cap: number | null,
  ): Promise<CreateServerOutcome> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`mcp:${input.ownerUserId}`}))`;
      const duplicate = await tx.mcpServer.findUnique({
        where: { ownerUserId_url: { ownerUserId: input.ownerUserId, url: input.url } },
        select: { id: true },
      });
      if (duplicate !== null) return { kind: 'DUPLICATE' } as const;
      const current = await tx.mcpServer.count({ where: { ownerUserId: input.ownerUserId } });
      if (cap !== null && current >= cap) return { kind: 'LIMIT', current } as const;
      await tx.mcpServer.create({
        data: {
          id: input.id,
          ownerUserId: input.ownerUserId,
          slug: input.slug,
          name: input.name,
          url: input.url,
          urlHost: input.urlHost,
          authKind: input.authKind,
          status: input.status,
          serverInfo: input.serverInfo === null ? undefined : toJsonValue(input.serverInfo),
          toolsHash: input.toolsHash,
          lastCheckedAt: new Date(),
          tools: {
            create: input.tools.map((tool) => ({
              name: tool.name,
              localName: tool.localName,
              description: tool.description,
              inputSchema: toJsonValue(tool.inputSchema),
              schemaHash: tool.schemaHash,
            })),
          },
          credential:
            input.credential === undefined
              ? undefined
              : { create: { userId: input.ownerUserId, ...input.credential } },
        },
      });
      return { kind: 'CREATED' } as const;
    });
  }

  async updateOwned(
    id: string,
    userId: string,
    data: { name?: string; status?: ServerRecord['status'] },
  ): Promise<boolean> {
    const result = await this.prisma.mcpServer.updateMany({
      where: { id, ownerUserId: userId },
      data,
    });
    return result.count > 0;
  }

  async updateTool(
    serverId: string,
    userId: string,
    localName: string,
    data: ToolUpdate,
  ): Promise<boolean> {
    const result = await this.prisma.mcpServerTool.updateMany({
      where: { serverId, localName, server: { ownerUserId: userId } },
      data,
    });
    return result.count > 0;
  }

  /** Replaces the whole tool snapshot in one transaction. False when the server is not the user's. */
  async replaceSnapshot(serverId: string, userId: string, write: SnapshotWrite): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.mcpServer.updateMany({
        where: { id: serverId, ownerUserId: userId },
        data: {
          toolsHash: write.toolsHash,
          status: write.status,
          lastCheckedAt: new Date(),
          lastErrorCode: null,
          ...(write.serverInfo === null ? {} : { serverInfo: toJsonValue(write.serverInfo) }),
        },
      });
      if (updated.count === 0) return false;
      await tx.mcpServerTool.deleteMany({ where: { serverId } });
      await tx.mcpServerTool.createMany({
        data: write.tools.map((tool) => ({
          serverId,
          name: tool.name,
          localName: tool.localName,
          description: tool.description,
          inputSchema: toJsonValue(tool.inputSchema),
          schemaHash: tool.schemaHash,
          riskLevel: tool.riskLevel,
          enabled: tool.enabled,
          consentGranted: tool.consentGranted,
        })),
      });
      return true;
    });
  }

  async deleteOwned(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.mcpServer.deleteMany({ where: { id, ownerUserId: userId } });
    return result.count > 0;
  }

  /** The server answered: the breaker closes and the failure streak resets. */
  async recordSuccess(serverId: string): Promise<void> {
    await this.prisma.mcpServer.updateMany({
      where: { id: serverId },
      data: {
        failureCount: 0,
        breakerOpenedAt: null,
        lastErrorCode: null,
        lastCheckedAt: new Date(),
      },
    });
  }

  /**
   * One more failure in a row. At the threshold the breaker (re)opens at now, in the same statement
   * as the increment, so two parallel failures cannot both miss it.
   */
  async recordFailure(serverId: string, errorCode: string, threshold: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE mcp_servers
      SET failure_count = failure_count + 1,
          last_error_code = ${errorCode},
          last_checked_at = now(),
          breaker_opened_at = CASE WHEN failure_count + 1 >= ${threshold} THEN now() ELSE breaker_opened_at END
      WHERE id = ${serverId}`;
  }

  /** Takes the single half-open probe: only one caller sees the observed opening time unchanged. */
  async claimProbe(serverId: string, observedOpenedAt: Date): Promise<boolean> {
    const result = await this.prisma.mcpServer.updateMany({
      where: { id: serverId, breakerOpenedAt: observedOpenedAt },
      data: { breakerOpenedAt: new Date() },
    });
    return result.count === 1;
  }

  async markChecked(serverId: string, userId: string, lastErrorCode: string | null): Promise<void> {
    await this.prisma.mcpServer.updateMany({
      where: { id: serverId, ownerUserId: userId },
      data: { lastCheckedAt: new Date(), lastErrorCode },
    });
  }
}
