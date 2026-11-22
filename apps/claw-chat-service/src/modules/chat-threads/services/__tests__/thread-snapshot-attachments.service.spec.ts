import { describe, expect, it, vi } from 'vitest';

import type { AttachmentInfoClient } from '../../../chat-messages/clients/attachment-info.client';
import type { ChatThreadsRepository } from '../../repositories/chat-threads.repository';
import { THREAD_SNAPSHOT_MAX_ATTACHMENT_FILES } from '../../constants/thread-snapshot.constants';
import { ThreadSnapshotService } from '../thread-snapshot.service';

const at = (minute: number) => new Date(`2026-10-01T12:${String(minute).padStart(2, '0')}:00.000Z`);

function repositoryWith(messages: unknown[]): ChatThreadsRepository {
  return {
    findOwnedSnapshotThread: vi.fn().mockResolvedValue({
      thread: { id: 'thread-1', title: 'Docs', createdAt: at(0) },
      messages,
    }),
  } as unknown as ChatThreadsRepository;
}

describe('ThreadSnapshotService attachment text', () => {
  it('reads user turn files as the owner, text only, and adds finished extracted text', async () => {
    const textOnly = vi.fn().mockResolvedValue([
      {
        id: 'f-doc',
        filename: 'notes.pdf',
        mimeType: 'application/pdf',
        content: 'QkFTRTY0LWJ5dGVz',
        extractedText: 'PDF body text',
        ingestionStatus: 'COMPLETED',
      },
      {
        id: 'f-video',
        filename: 'clip.mp4',
        mimeType: 'video/mp4',
        content: null,
        extractedText: 'partial transcript',
        ingestionStatus: 'PROCESSING',
      },
    ]);
    const service = new ThreadSnapshotService(
      repositoryWith([
        {
          id: 'm1',
          role: 'USER',
          content: 'Summarise these',
          createdAt: at(1),
          metadata: { fileIds: ['f-doc', 'f-video'] },
        },
        {
          id: 'm2',
          role: 'ASSISTANT',
          content: 'Done',
          createdAt: at(2),
          metadata: { fileIds: ['f-generated'] },
        },
      ]),
      { textOnly } as unknown as AttachmentInfoClient,
    );

    const result = await service.create('owner-1', 'thread-1');

    expect(textOnly).toHaveBeenCalledTimes(1);
    expect(textOnly).toHaveBeenCalledWith(['f-doc', 'f-video'], 'owner-1');
    expect(result.messages[0]?.attachments).toEqual([
      { name: 'notes.pdf', mimeType: 'application/pdf', text: 'PDF body text' },
    ]);
    // The bytes and an unfinished transcript never become snapshot text.
    expect(JSON.stringify(result)).not.toContain('QkFTRTY0LWJ5dGVz');
    expect(JSON.stringify(result)).not.toContain('partial transcript');
    expect(result.attachmentNote).toContain('1 attached file(s) had no readable text');
  });

  it('reads only the newest files up to the cap, in bounded batches, and counts the rest', async () => {
    const total = THREAD_SNAPSHOT_MAX_ATTACHMENT_FILES + 2;
    const messages = Array.from({ length: total }, (_, index) => ({
      id: `m${String(index)}`,
      role: 'USER',
      content: `turn ${String(index)}`,
      createdAt: at(index % 60),
      metadata: { fileIds: [`f${String(index)}`] },
    }));
    const textOnly = vi.fn((ids: string[]) =>
      Promise.resolve(
        ids.map((id) => ({
          id,
          filename: `${id}.txt`,
          mimeType: 'text/plain',
          content: null,
          extractedText: `text of ${id}`,
          ingestionStatus: 'COMPLETED',
        })),
      ),
    );
    const service = new ThreadSnapshotService(repositoryWith(messages), {
      textOnly,
    } as unknown as AttachmentInfoClient);

    const result = await service.create('owner-1', 'thread-1');
    const requested = textOnly.mock.calls.flatMap(([ids]) => ids);

    expect(requested).toHaveLength(THREAD_SNAPSHOT_MAX_ATTACHMENT_FILES);
    expect(requested).not.toContain('f0');
    expect(requested).not.toContain('f1');
    expect(Math.max(...textOnly.mock.calls.map(([ids]) => ids.length))).toBeLessThanOrEqual(8);
    expect(result.messages[0]).not.toHaveProperty('attachments');
    expect(result.messages[total - 1]?.attachments?.[0]?.text).toBe(
      `text of f${String(total - 1)}`,
    );
    expect(result.attachmentNote).toContain('2 older attached file(s) not read');
  });

  it('builds the text-only snapshot when no file can be read', async () => {
    const service = new ThreadSnapshotService(
      repositoryWith([
        { id: 'm1', role: 'USER', content: 'Hi', createdAt: at(1), metadata: { fileIds: ['f1'] } },
      ]),
      { textOnly: vi.fn().mockResolvedValue([]) } as unknown as AttachmentInfoClient,
    );

    const result = await service.create('owner-1', 'thread-1');

    expect(result.messages[0]?.content).toBe('Hi');
    expect(result.messages[0]).not.toHaveProperty('attachments');
    expect(result.attachmentNote).toContain('1 attached file(s) had no readable text');
  });
});
