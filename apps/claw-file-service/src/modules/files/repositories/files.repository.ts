import { Injectable } from "@nestjs/common";
import { type File, type FileIngestionStatus, Prisma } from "../../../generated/prisma";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import {
  type CreateFileData,
  type FileFilters,
  type FileWithChunks,
} from "../types/files.types";

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFileData): Promise<File> {
    return this.prisma.file.create({ data });
  }

  async findById(id: string): Promise<FileWithChunks | null> {
    return this.prisma.file.findUnique({
      where: { id },
      include: { chunks: { orderBy: { chunkIndex: "asc" } } },
    });
  }

  async findAll(
    filters: FileFilters,
    page: number,
    limit: number,
  ): Promise<File[]> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    return this.prisma.file.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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

  async countAll(filters: FileFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.file.count({ where });
  }

  private buildWhereClause(filters: FileFilters): Prisma.FileWhereInput {
    const where: Prisma.FileWhereInput = {
      userId: filters.userId,
    };

    if (filters.ingestionStatus !== undefined) {
      where.ingestionStatus = filters.ingestionStatus;
    }

    if (filters.search) {
      where.filename = { contains: filters.search, mode: "insensitive" };
    }

    return where;
  }
}
