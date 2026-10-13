import { Injectable } from '@nestjs/common';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type InstallConsentRecord,
  type InstallCredentialRecord,
  type SaveCredentialInput,
} from '../types/install.types';

/** Credentials and tool consents: both are keyed by an install the caller has already proven they own. */
@Injectable()
export class InstallSecretsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Stores (or replaces) the sealed secret. The row never leaves this repository with the ciphertext. */
  async saveCredential(input: SaveCredentialInput): Promise<InstallCredentialRecord> {
    const data = {
      kind: input.kind,
      headerName: input.headerName,
      ciphertext: input.ciphertext,
      keyVersion: input.keyVersion,
    };
    const row = await this.prisma.pluginCredential.upsert({
      where: { installId: input.installId },
      create: { ...data, userId: input.userId, installId: input.installId },
      update: data,
      select: { kind: true, updatedAt: true },
    });
    return { kind: AuthKind[row.kind], updatedAt: row.updatedAt };
  }

  async deleteCredential(installId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.pluginCredential.deleteMany({ where: { installId, userId } });
    return result.count > 0;
  }

  async saveConsent(
    installId: string,
    toolName: string,
    level: RiskLevel,
  ): Promise<InstallConsentRecord> {
    const grantedAt = new Date();
    const row = await this.prisma.pluginToolConsent.upsert({
      where: { installId_toolName: { installId, toolName } },
      create: { installId, toolName, level, grantedAt },
      update: { level, grantedAt },
      select: { toolName: true, level: true, grantedAt: true },
    });
    return { toolName: row.toolName, level: RiskLevel[row.level], grantedAt: row.grantedAt };
  }

  async deleteConsent(installId: string, toolName: string): Promise<boolean> {
    const result = await this.prisma.pluginToolConsent.deleteMany({
      where: { installId, toolName },
    });
    return result.count > 0;
  }
}
