import { Injectable } from '@nestjs/common';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { ServerState } from '../../../common/enums/server-status.enum';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { SERVERS_QUEUE_MAX } from '../constants/curation.constants';
import { QUEUE_SELECT } from '../constants/pending-server-query.constants';
import { type PendingServerRecord } from '../types/curation.types';

/** Admin view of every user's servers. The credential is only ever tested for existence, never selected. */
@Injectable()
export class PendingServersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByStatus(status: ServerState): Promise<PendingServerRecord[]> {
    const rows = await this.prisma.mcpServer.findMany({
      where: { status },
      select: QUEUE_SELECT,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: SERVERS_QUEUE_MAX,
    });
    return rows.map((row) => this.toRecord(row));
  }

  async findById(id: string): Promise<PendingServerRecord | null> {
    const row = await this.prisma.mcpServer.findUnique({ where: { id }, select: QUEUE_SELECT });
    return row === null ? null : this.toRecord(row);
  }

  /** Moves the server only if it is still in one of the given states; false means someone else got there first. */
  async decide(
    id: string,
    from: readonly ServerState[],
    to: ServerState,
    adminId: string,
    reason: string | null,
  ): Promise<boolean> {
    const result = await this.prisma.mcpServer.updateMany({
      where: { id, status: { in: [...from] } },
      data: { status: to, decidedBy: adminId, decidedAt: new Date(), decisionReason: reason },
    });
    return result.count === 1;
  }

  private toRecord(row: {
    id: string;
    slug: string;
    name: string;
    ownerUserId: string;
    url: string;
    urlHost: string;
    authKind: keyof typeof AuthKind;
    status: keyof typeof ServerState;
    serverInfo: unknown;
    toolsHash: string | null;
    createdAt: Date;
    decidedBy: string | null;
    decidedAt: Date | null;
    decisionReason: string | null;
    credential: { id: string } | null;
    tools: Array<{ name: string; description: string; riskLevel: keyof typeof RiskLevel }>;
  }): PendingServerRecord {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      ownerUserId: row.ownerUserId,
      url: row.url,
      urlHost: row.urlHost,
      authKind: AuthKind[row.authKind],
      hasCredential: row.credential !== null,
      status: ServerState[row.status],
      serverInfo: row.serverInfo,
      toolsHash: row.toolsHash,
      createdAt: row.createdAt,
      decidedBy: row.decidedBy,
      decidedAt: row.decidedAt,
      decisionReason: row.decisionReason,
      tools: row.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        riskLevel: RiskLevel[tool.riskLevel],
      })),
    };
  }
}
