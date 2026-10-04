import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { ChatThreadsRepository } from '../repositories/chat-threads.repository';
import { THREAD_SNAPSHOT_MAX_MESSAGES } from '../constants/thread-snapshot.constants';
import { buildThreadSnapshot } from '../utilities/thread-snapshot.utility';
import type { ThreadSnapshot } from '../types/thread-snapshot.types';

@Injectable()
export class ThreadSnapshotService {
  constructor(private readonly threads: ChatThreadsRepository) {}

  async create(userId: string, threadId: string): Promise<ThreadSnapshot> {
    const snapshotSource = await this.threads.findOwnedSnapshotThread(
      userId,
      threadId,
      THREAD_SNAPSHOT_MAX_MESSAGES + 1,
    );
    if (!snapshotSource) throw new NotFoundException('Thread not found');
    const { thread: source, messages } = snapshotSource;
    if (messages.length > THREAD_SNAPSHOT_MAX_MESSAGES) {
      throw new BadRequestException('Thread is too large to snapshot completely');
    }
    try {
      return buildThreadSnapshot({ ...source, threadId: source.id, messages });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid snapshot');
    }
  }
}
