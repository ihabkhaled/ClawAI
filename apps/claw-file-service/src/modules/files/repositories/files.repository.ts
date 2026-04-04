import { Injectable } from "@nestjs/common";
import { type File } from "../../../generated/prisma";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { CreateFileInput, FileFilters, FileWithChunks, UpdateFileIngestionInput } from "../types/files.types";

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateFileInput): Promise<File> {
    return this.prisma.file.create({ data: input });
  }

  async findById(id: string): Promise<FileWithChunks | null> {
    return this.prisma.file.findUnique({
      where: { id },
      include: { chunks: { orderBy: { chunkIndex: "asc" } } },
    });
  }

  async findMany(filters: FileFilters): Promise<File[]> {
    return this.prisma.file.findMany({
      where: {
        userId: filters.userId,
        ...(filters.ingestionStatus !== undefined && { ingestionStatus: filters.ingestionStatus }),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateIngestion(id: string, input: UpdateFileIngestionInput): Promise<File> {
    return this.prisma.file.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string): Promise<File> {
    return this.prisma.file.delete({ where: { id } });
  }
}
