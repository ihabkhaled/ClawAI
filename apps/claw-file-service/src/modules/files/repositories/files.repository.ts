import { Injectable, Logger } from '@nestjs/common';
import { type File, FileIngestionStatus, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type CreateFileData, type FileFilters, type FileWithChunks } from '../types/files.types';
import { type ChildExtractionState } from '../types/archive-manifest.types';
import { type ArchiveExtractionMetadata } from '../types/zip-expansion.types';
import { type ArchiveChildRow, type ArchiveParentRow } from '../types/archive-entries.types';
import { type VideoExtractionWrite } from '../types/video-processing.types';
import { VIDEO_PLACEHOLDER_PREFIX } from '../constants/video-processing.constants';
import { effectiveIngestionStatusWhere } from '../utilities/effective-ingestion-filter.utility';

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

  /**
   * Stores what a language model will actually be shown for this file.
   *
   * Separate from `updateIngestionStatus` because the text and the terminal
   * status must land together: a row that says COMPLETED with no text, or
   * carries text while still PROCESSING, is a state the readers cannot
   * interpret.
   */
  async saveExtractionResult(
    id: string,
    result: {
      extractedText: string | null;
      extractionError: string | null;
      status: FileIngestionStatus;
    },
  ): Promise<File> {
    return this.prisma.file.update({
      where: { id },
      data: {
        extractedText: result.extractedText,
        extractionError: result.extractionError,
        ingestionStatus: result.status,
      },
    });
  }

  /**
   * The ONE write that ends a video job (multimodal batch 7): the timestamped
   * document (or null), the reason, the terminal status and
   * `extractionMetadata.media`, in a single update — rule 42 item 4. A video
   * row carries no archive metadata, so the column is replaced, not merged.
   *
   * CONDITIONAL on the row still being the awaiting placeholder (COMPLETED,
   * `[Video file: …]`, no reason) — the same state `isVideoAwaitingProcessing`
   * reads. A user cancel and the job race through here: whichever lands first
   * wins, so a late job can never overwrite a cancelled result and a cancel
   * can never clobber a document that just landed. Returns whether THIS call
   * wrote the row; the caller publishes its event only when it did.
   */
  async saveVideoExtractionResult(id: string, write: VideoExtractionWrite): Promise<boolean> {
    const { count } = await this.prisma.file.updateMany({
      where: {
        id,
        ingestionStatus: FileIngestionStatus.COMPLETED,
        extractionError: null,
        extractedText: { startsWith: VIDEO_PLACEHOLDER_PREFIX },
      },
      data: {
        extractedText: write.extractedText,
        extractionError: write.extractionError,
        ingestionStatus: write.status,
        extractionMetadata: write.metadata,
      },
    });
    return count === 1;
  }

  /**
   * Rows whose extraction started and never finished.
   *
   * A container restart mid-extraction leaves PROCESSING with nobody to move it,
   * and an unfinished row keeps the file-list poller running indefinitely. The
   * sweeper uses this to close them out.
   */
  async findStaleProcessingBefore(cutoff: Date, limit: number): Promise<File[]> {
    return this.prisma.file.findMany({
      where: { ingestionStatus: 'PROCESSING', updatedAt: { lt: cutoff } },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    });
  }

  async delete(id: string): Promise<File> {
    return this.prisma.file.delete({ where: { id } });
  }

  // Slice C backend 2 — ZIP archive expansion.
  // Stamps the parent linkage on a child file after it has been onboarded
  // from an extracted entry. Kept as a focused update so the repository
  // contract stays narrow (CreateFileData remains the upload-only shape).
  // `archivePath` is the entry's path inside the archive; `filename` is only
  // its basename.
  async markAsExtractedChild(id: string, parentFileId: string, archivePath: string): Promise<File> {
    this.logger.debug(`markAsExtractedChild: id=${id} parentFileId=${parentFileId}`);
    return this.prisma.file.update({
      where: { id },
      data: { parentFileId, isExtracted: true, archivePath },
    });
  }

  /**
   * The extraction outcome of one row, without its chunks or original bytes.
   * The archive manifest reads this once per child to classify it.
   */
  async findExtractionState(id: string): Promise<ChildExtractionState | null> {
    return this.prisma.file.findUnique({
      where: { id },
      select: {
        mimeType: true,
        extractedText: true,
        extractionError: true,
        ingestionStatus: true,
      },
    });
  }

  /** Only the extracted text of one row — what the archive manifest packs. */
  async findExtractedText(id: string): Promise<string | null> {
    const row = await this.prisma.file.findUnique({
      where: { id },
      select: { extractedText: true },
    });
    return row?.extractedText ?? null;
  }

  // Slice C backend 2 — ZIP archive expansion.
  // Records the aggregate extraction outcome on the PARENT archive row
  // (child count, total uncompressed bytes, expansion timestamp, skip counts).
  async recordExtractionMetadata(id: string, metadata: ArchiveExtractionMetadata): Promise<File> {
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

  /**
   * How many files were extracted from each of `parentIds`. The file list uses
   * it to mark archive rows; ids with no children are absent from the map.
   */
  async countChildrenByParent(parentIds: ReadonlyArray<string>): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (parentIds.length === 0) {
      return counts;
    }
    const groups = await this.prisma.file.groupBy({
      by: ['parentFileId'],
      where: { parentFileId: { in: [...parentIds] } },
      _count: { _all: true },
    });
    for (const group of groups) {
      if (group.parentFileId !== null) {
        counts.set(group.parentFileId, group._count._all);
      }
    }
    return counts;
  }

  /**
   * The columns a password retry needs: enough to re-run extraction
   * (`storagePath`, `filename`) and enough to enforce the retry cap
   * (`extractionMetadata.passwordAttempts`), without the original bytes or
   * chunks.
   */
  async findForPasswordRetry(id: string): Promise<File | null> {
    return this.prisma.file.findUnique({ where: { id } });
  }

  /** An archive's own row, without its original bytes or chunks. */
  async findArchiveParent(id: string): Promise<ArchiveParentRow | null> {
    return this.prisma.file.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        filename: true,
        extractedText: true,
        extractionError: true,
        ingestionStatus: true,
      },
    });
  }

  /** The files extracted from one archive, in path order, capped at `limit`. */
  async findArchiveChildren(parentFileId: string, limit: number): Promise<ArchiveChildRow[]> {
    return this.prisma.file.findMany({
      where: { parentFileId },
      select: {
        id: true,
        archivePath: true,
        filename: true,
        sizeBytes: true,
        mimeType: true,
        ingestionStatus: true,
      },
      orderBy: { archivePath: 'asc' },
      take: limit,
    });
  }

  async countArchiveChildren(parentFileId: string): Promise<number> {
    return this.prisma.file.count({ where: { parentFileId } });
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
    // Top-level rows unless a parent is named: an archive's children are listed
    // under it, not on the page beside it, where 500 of them would fill every
    // page of the list.
    const where: Prisma.FileWhereInput = {
      userId: filters.userId,
      parentFileId: filters.parentFileId ?? null,
    };

    // The status the OWNER sees, not the stored column: a placeholder audio /
    // video row stored COMPLETED is listed under PROCESSING (or FAILED) exactly
    // as the response shows it (rule 42 items 10 + 12). Query-level only.
    if (filters.ingestionStatus !== undefined) {
      where.AND = [effectiveIngestionStatusWhere(filters.ingestionStatus, filters.now)];
    }

    if (filters.search) {
      where.filename = { contains: filters.search, mode: 'insensitive' };
    }

    return where;
  }
}
