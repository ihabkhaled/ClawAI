import { Injectable } from '@nestjs/common';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type SealedCredentialRecord,
  type SealedServerCredential,
} from '../types/mcp-server.types';

/** The write-only credential of a user server. The ciphertext leaves only through findSealed, for the call path. */
@Injectable()
export class McpServerSecretsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Stores (or replaces) the sealed secret of a server the caller has already proven they own. */
  async save(userId: string, serverId: string, credential: SealedServerCredential): Promise<Date> {
    const row = await this.prisma.mcpServerCredential.upsert({
      where: { serverId },
      create: { userId, serverId, ...credential },
      update: credential,
      select: { updatedAt: true },
    });
    return row.updatedAt;
  }

  async delete(userId: string, serverId: string): Promise<boolean> {
    const result = await this.prisma.mcpServerCredential.deleteMany({
      where: { serverId, userId },
    });
    return result.count > 0;
  }

  async findSealed(userId: string, serverId: string): Promise<SealedCredentialRecord | null> {
    const row = await this.prisma.mcpServerCredential.findFirst({
      where: { serverId, userId },
      select: { kind: true, headerName: true, ciphertext: true },
    });
    return row === null
      ? null
      : { kind: AuthKind[row.kind], headerName: row.headerName, ciphertext: row.ciphertext };
  }
}
