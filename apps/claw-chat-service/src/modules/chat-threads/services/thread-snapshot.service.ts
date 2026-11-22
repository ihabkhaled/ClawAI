import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';

import { AttachmentInfoClient } from '../../chat-messages/clients/attachment-info.client';
import type { FileContentResponse } from '../../chat-messages/types/context.types';
import { ChatThreadsRepository } from '../repositories/chat-threads.repository';
import {
  THREAD_SNAPSHOT_ATTACHMENT_FETCH_CONCURRENCY,
  THREAD_SNAPSHOT_MAX_ATTACHMENT_FILES,
  THREAD_SNAPSHOT_MAX_MESSAGES,
} from '../constants/thread-snapshot.constants';
import { buildThreadSnapshot } from '../utilities/thread-snapshot.utility';
import { snapshotFileIdsOf, snapshotTextOf } from '../utilities/thread-snapshot-attachment.utility';
import type {
  ThreadSnapshot,
  ThreadSnapshotAttachmentInput,
  ThreadSnapshotMessageInput,
} from '../types/thread-snapshot.types';

@Injectable()
export class ThreadSnapshotService {
  constructor(
    private readonly threads: ChatThreadsRepository,
    @Optional() private readonly attachments?: AttachmentInfoClient,
  ) {}

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
    const attached = await this.withAttachedText(userId, messages);
    try {
      return buildThreadSnapshot({ ...source, threadId: source.id, ...attached });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid snapshot');
    }
  }

  /**
   * Each user turn with the text of the files attached to it, read from file-service as the
   * thread owner (file-service checks ownership) without the bytes. The newest files are read
   * first, at most `THREAD_SNAPSHOT_MAX_ATTACHMENT_FILES`; a file that cannot be read is counted
   * as having no text, never fails the snapshot.
   */
  private async withAttachedText(
    userId: string,
    messages: ThreadSnapshotMessageInput[],
  ): Promise<{ messages: ThreadSnapshotMessageInput[]; unreadAttachmentCount: number }> {
    const client = this.attachments;
    const newestFirst = [...messages].reverse().flatMap(snapshotFileIdsOf);
    const wanted = [...new Set(newestFirst)];
    if (client === undefined || wanted.length === 0) {
      return { messages, unreadAttachmentCount: 0 };
    }
    const toRead = new Set(wanted.slice(0, THREAD_SNAPSHOT_MAX_ATTACHMENT_FILES));
    const files = new Map<string, FileContentResponse>();
    const ids = [...toRead];
    for (let start = 0; start < ids.length; start += THREAD_SNAPSHOT_ATTACHMENT_FETCH_CONCURRENCY) {
      const batch = ids.slice(start, start + THREAD_SNAPSHOT_ATTACHMENT_FETCH_CONCURRENCY);
      for (const file of await client.textOnly(batch, userId)) files.set(file.id, file);
    }
    let unread = 0;
    const withText = messages.map((message) => {
      const fileIds = snapshotFileIdsOf(message);
      if (fileIds.length === 0) return message;
      const attachments: ThreadSnapshotAttachmentInput[] = [];
      for (const fileId of fileIds) {
        if (!toRead.has(fileId)) {
          unread += 1;
          continue;
        }
        const file = files.get(fileId);
        attachments.push(
          file === undefined
            ? { name: 'attachment', mimeType: 'application/octet-stream', text: null }
            : { name: file.filename, mimeType: file.mimeType, text: snapshotTextOf(file) },
        );
      }
      return { ...message, attachments };
    });
    return { messages: withText, unreadAttachmentCount: unread };
  }
}
