import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { FileDeliveryRecordRepository } from '../repositories/file-delivery-record.repository';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import {
  type FileDeliveryRecordInput,
  type FileDeliveryRecordView,
} from '../types/file-delivery-record.types';

// Service layer for file delivery records. Owns ownership validation for the
// GET endpoint and logs row counts on the dual-write path used by the parallel
// execution manager.
@Injectable()
export class FileDeliveryRecordService {
  private readonly logger = new Logger(FileDeliveryRecordService.name);

  constructor(
    private readonly fileDeliveryRecordRepository: FileDeliveryRecordRepository,
    private readonly chatMessagesRepository: ChatMessagesRepository,
    private readonly chatThreadsRepository: ChatThreadsRepository,
  ) {}

  async recordDeliveries(records: FileDeliveryRecordInput[]): Promise<void> {
    this.logger.debug(`recordDeliveries: writing ${String(records.length)} rows`);
    if (records.length === 0) {
      return;
    }
    try {
      await this.fileDeliveryRecordRepository.createMany(records);
      this.logger.log(`recordDeliveries: wrote ${String(records.length)} delivery rows`);
    } catch (error) {
      this.logger.error(
        `recordDeliveries: failed for ${String(records.length)} rows — ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async getDeliveriesForMessage(
    messageId: string,
    userId: string,
  ): Promise<FileDeliveryRecordView[]> {
    this.logger.debug(`getDeliveriesForMessage: messageId=${messageId} userId=${userId}`);
    try {
      await this.assertMessageOwnership(messageId, userId);
      return await this.fileDeliveryRecordRepository.findByMessageId(messageId);
    } catch (error) {
      this.logger.error(
        `getDeliveriesForMessage: failed messageId=${messageId} — ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private async assertMessageOwnership(messageId: string, userId: string): Promise<void> {
    const message = await this.chatMessagesRepository.findById(messageId);
    if (!message) {
      throw new EntityNotFoundException('ChatMessage', messageId);
    }
    const thread = await this.chatThreadsRepository.findById(message.threadId);
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', message.threadId);
    }
    if (thread.userId !== userId) {
      throw new BusinessException(
        'You do not have access to this message',
        'FORBIDDEN_MESSAGE_ACCESS',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
