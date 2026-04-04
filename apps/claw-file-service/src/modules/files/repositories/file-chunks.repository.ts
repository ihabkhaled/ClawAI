import { Injectable } from "@nestjs/common";
import { type FileChunk } from "../../../generated/prisma";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type ChunkData } from "../types/files.types";

@Injectable()
export class FileChunksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(chunks: ChunkData[]): Promise<number> {
    const result = await this.prisma.fileChunk.createMany({ data: chunks });
    return result.count;
  }

  async findByFileId(fileId: string): Promise<FileChunk[]> {
    return this.prisma.fileChunk.findMany({
      where: { fileId },
      orderBy: { chunkIndex: "asc" },
    });
  }

  async deleteByFileId(fileId: string): Promise<number> {
    const result = await this.prisma.fileChunk.deleteMany({ where: { fileId } });
    return result.count;
  }
}
