import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type FileDeliveryRecord } from '../../../generated/prisma';
import { type FileDeliveryRecordInput } from '../types/file-delivery-record.types';

// Pure data access for the file_delivery_records table. Never throws — callers
// (services) decide how to surface errors. `createMany` is used by the dual-
// write window in ParallelExecutionManager; `findByMessageId` powers the new
// GET /chat-messages/:id/file-delivery endpoint.
@Injectable()
export class FileDeliveryRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(records: FileDeliveryRecordInput[]): Promise<void> {
    if (records.length === 0) {
      return;
    }
    await this.prisma.fileDeliveryRecord.createMany({
      data: records,
      skipDuplicates: true,
    });
  }

  async findByMessageId(messageId: string): Promise<FileDeliveryRecord[]> {
    return this.prisma.fileDeliveryRecord.findMany({
      where: { messageId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByThreadId(threadId: string, limit: number): Promise<FileDeliveryRecord[]> {
    return this.prisma.fileDeliveryRecord.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async deleteByMessageId(messageId: string): Promise<void> {
    await this.prisma.fileDeliveryRecord.deleteMany({ where: { messageId } });
  }
}
