import { Injectable } from '@nestjs/common';

import { ImportAuditAction } from '../../../common/enums/import-audit-action.enum';
import { ImportInstallOutcome } from '../../../common/enums/import-install-outcome.enum';
import { toJsonValue } from '../../../common/utilities/to-json-value.utility';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { IMPORT_QUOTA, UNIQUE_VIOLATION_CODE } from '../constants/plugin-import.constants';
import {
  type DraftRecord,
  type ImportPreview,
  type InstallDraftResult,
  type NewDraft,
  type PluginRecord,
  type PluginRow,
  type StoredDraftFile,
} from '../types/plugin-import.types';

@Injectable()
export class PluginImportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(input: NewDraft): Promise<DraftRecord> {
    const now = new Date();
    await this.prisma.pluginImportDraft.deleteMany({
      where: { userId: input.userId, expiresAt: { lt: now } },
    });
    const surplus = await this.prisma.pluginImportDraft.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: 'desc' },
      skip: IMPORT_QUOTA.maxDrafts - 1,
      select: { id: true },
    });
    if (surplus.length > 0) {
      await this.prisma.pluginImportDraft.deleteMany({
        where: { id: { in: surplus.map((row) => row.id) } },
      });
    }
    const expiresAt = new Date(now.getTime() + IMPORT_QUOTA.draftTtlMs);
    const row = await this.prisma.pluginImportDraft.create({
      data: {
        userId: input.userId,
        sourceKind: input.sourceKind,
        sourceRef: input.sourceRef,
        commitSha: input.commitSha,
        checksum: input.checksum,
        preview: toJsonValue(input.preview),
        files: toJsonValue(input.files),
        totalBytes: input.totalBytes,
        expiresAt,
      },
    });
    return { ...input, id: row.id, expiresAt };
  }

  async findDraft(id: string, userId: string): Promise<DraftRecord | null> {
    const row = await this.prisma.pluginImportDraft.findFirst({
      where: { id, userId, expiresAt: { gt: new Date() } },
    });
    if (row === null) return null;
    return {
      id: row.id,
      userId: row.userId,
      sourceKind: row.sourceKind,
      sourceRef: row.sourceRef,
      commitSha: row.commitSha,
      checksum: row.checksum,
      preview: row.preview as unknown as ImportPreview,
      files: row.files as unknown as StoredDraftFile[],
      totalBytes: row.totalBytes,
      expiresAt: row.expiresAt,
    };
  }

  /**
   * Installs the draft and writes the audit row in one transaction, re-checking the quota inside it.
   * Answers with an outcome; the service turns a refusal into the right error.
   */
  async installDraft(draft: DraftRecord, nameKey: string): Promise<InstallDraftResult> {
    return this.prisma
      .$transaction(async (tx): Promise<InstallDraftResult> => {
        const usage = await tx.importedPlugin.aggregate({
          where: { userId: draft.userId },
          _count: { _all: true },
          _sum: { totalBytes: true },
        });
        if (usage._count._all >= IMPORT_QUOTA.maxPlugins) {
          return { outcome: ImportInstallOutcome.QUOTA_PLUGINS };
        }
        const storedBytes = draft.files.reduce(
          (sum, file) => sum + Buffer.byteLength(file.content, 'utf8'),
          0,
        );
        if ((usage._sum.totalBytes ?? 0) + storedBytes > IMPORT_QUOTA.maxTotalBytes) {
          return { outcome: ImportInstallOutcome.QUOTA_BYTES };
        }
        const row = await tx.importedPlugin.create({
          data: {
            userId: draft.userId,
            name: draft.preview.name,
            nameKey,
            version: draft.preview.version,
            sourceKind: draft.sourceKind,
            sourceRef: draft.sourceRef,
            commitSha: draft.commitSha,
            checksum: draft.checksum,
            preview: toJsonValue(draft.preview),
            totalBytes: storedBytes,
            fileCount: draft.files.length,
            files: {
              create: draft.files.map((file) => ({
                path: file.path,
                content: file.content,
                bytes: Buffer.byteLength(file.content, 'utf8'),
              })),
            },
          },
        });
        await tx.pluginImportAudit.create({
          data: {
            userId: draft.userId,
            action: ImportAuditAction.IMPORT,
            pluginName: draft.preview.name,
            sourceKind: draft.sourceKind,
            sourceRef: draft.sourceRef,
            commitSha: draft.commitSha,
            checksum: draft.checksum,
          },
        });
        await tx.pluginImportDraft.deleteMany({ where: { id: draft.id } });
        return { outcome: ImportInstallOutcome.INSTALLED, record: this.toRecord(row) };
      })
      .catch((error: unknown): Promise<InstallDraftResult> => {
        const duplicate = (error as { code?: string }).code === UNIQUE_VIOLATION_CODE;
        return duplicate
          ? Promise.resolve({ outcome: ImportInstallOutcome.DUPLICATE })
          : Promise.reject(error instanceof Error ? error : new Error(String(error)));
      });
  }

  async list(userId: string): Promise<PluginRecord[]> {
    const rows = await this.prisma.importedPlugin.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: IMPORT_QUOTA.maxPlugins,
    });
    return rows.map((row) => this.toRecord(row));
  }

  async findOwned(id: string, userId: string): Promise<PluginRecord | null> {
    const row = await this.prisma.importedPlugin.findFirst({ where: { id, userId } });
    return row === null ? null : this.toRecord(row);
  }

  /** Deletes the plugin (files cascade) and audits it; false when the id is not the caller's. */
  async remove(id: string, userId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.importedPlugin.findFirst({ where: { id, userId } });
      if (row === null) return false;
      await tx.importedPlugin.delete({ where: { id } });
      await tx.pluginImportAudit.create({
        data: {
          userId,
          action: ImportAuditAction.REMOVE,
          pluginName: row.name,
          sourceKind: row.sourceKind,
          sourceRef: row.sourceRef,
          commitSha: row.commitSha,
          checksum: row.checksum,
        },
      });
      return true;
    });
  }

  private toRecord(row: PluginRow): PluginRecord {
    return {
      id: row.id,
      name: row.name,
      version: row.version,
      sourceKind: row.sourceKind,
      sourceRef: row.sourceRef,
      commitSha: row.commitSha,
      checksum: row.checksum,
      preview: row.preview as ImportPreview,
      totalBytes: row.totalBytes,
      fileCount: row.fileCount,
      createdAt: row.createdAt,
    };
  }
}
