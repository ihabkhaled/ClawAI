import { Injectable, Logger } from '@nestjs/common';
import { type File, type FileIngestionStatus, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type CreateFileData, type FileFilters, type FileWithChunks } from '../types/files.types';

@Injectable()
export class FilesRepository {
  private readonly logger = new Logger(FilesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFileData): Promise<File> {
    this.logger.debug(`create: filename=${data.filename}`);
    return this.prisma.file.create({ data });
  }

  async findById(id: string): Promise<FileWithChunks | null> {
    return this.prisma.file.findUnique({
      where: { id },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    });
  }

  async findAll(filters: FileFilters, page: number, limit: number): Promise<File[]> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    return this.prisma.file.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateIngestionStatus(id: string, status: FileIngestionStatus): Promise<File> {
    return this.prisma.file.update({
      where: { id },
      data: { ingestionStatus: status },
    });
  }

  async delete(id: string): Promise<File> {
    return this.prisma.file.delete({ where: { id } });
  }

  // Slice C backend 2 — ZIP archive expansion.
  // Stamps the parent linkage on a child file after it has been onboarded
  // from an extracted entry. Kept as a focused update so the repository
  // contract stays narrow (CreateFileData remains the upload-only shape).
  async markAsExtractedChild(id: string, parentFileId: string): Promise<File> {
    this.logger.debug(`markAsExtractedChild: id=${id} parentFileId=${parentFileId}`);
    return this.prisma.file.update({
      where: { id },
      data: { parentFileId, isExtracted: true },
    });
  }

  // Slice C backend 2 — ZIP archive expansion.
  // Records the aggregate extraction outcome on the PARENT archive row
  // (child count, total uncompressed bytes, expansion timestamp).
  async recordExtractionMetadata(
    id: string,
    metadata: { childFileCount: number; totalExtractedBytes: number; expandedAt: string },
  ): Promise<File> {
    this.logger.debug(
      `recordExtractionMetadata: id=${id} children=${String(metadata.childFileCount)} bytes=${String(metadata.totalExtractedBytes)}`,
    );
    return this.prisma.file.update({
      where: { id },
      data: { extractionMetadata: metadata },
    });
  }

  async countAll(filters: FileFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.file.count({ where });
  }

  // Slice C foundation 3 — file retention sweeper.
  // Returns files whose retentionExpiresAt is strictly older than the cutoff. The
  // limit keeps each sweep tick bounded (so DB row locks stay short and the cron
  // tick never holds the connection longer than necessary).
  async findExpiredBefore(cutoff: Date, limit: number): Promise<File[]> {
    this.logger.debug(`findExpiredBefore: cutoff=${cutoff.toISOString()} limit=${String(limit)}`);
    return this.prisma.file.findMany({
      where: {
        retentionExpiresAt: {
          not: null,
          lt: cutoff,
        },
      },
      take: limit,
      orderBy: { retentionExpiresAt: 'asc' },
    });
  }

  // Repository purity: no throw. Caller decides what to do on failure.
  // We swallow Prisma errors here (e.g. row already deleted by a concurrent
  // sweep, FK constraint dropped) and only log — the sweeper manager logs
  // before calling us, so silent return is safe.
  async deleteById(id: string): Promise<void> {
    this.logger.debug(`deleteById: id=${id}`);
    try {
      await this.prisma.file.delete({ where: { id } });
    } catch (error) {
      this.logger.warn(
        `deleteById: prisma delete failed for id=${id} — ${(error as Error).message}`,
      );
    }
  }

  private buildWhereClause(filters: FileFilters): Prisma.FileWhereInput {
    const where: Prisma.FileWhereInput = {
      userId: filters.userId,
    };

    if (filters.ingestionStatus !== undefined) {
      where.ingestionStatus = filters.ingestionStatus;
    }

    if (filters.search) {
      where.filename = { contains: filters.search, mode: 'insensitive' };
    }

    return where;
  }
}
