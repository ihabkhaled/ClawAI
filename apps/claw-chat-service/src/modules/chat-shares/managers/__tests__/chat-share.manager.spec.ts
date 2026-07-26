import { AppConfig } from '../../../../app/config/app.config';
import { EntityNotFoundException } from '../../../../common/errors';
import { ChatShareManager } from '../chat-share.manager';
import { ChatShareMapperService } from '../../services/chat-share-mapper.service';
import type { ChatMessagesRepository } from '../../../chat-messages/repositories/chat-messages.repository';
import type { ChatSharesRepository } from '../../repositories/chat-shares.repository';
import type { ChatThreadsRepository } from '../../../chat-threads/repositories/chat-threads.repository';
import {
  type ChatMessage,
  ChatShareSafetyStatus,
  ChatShareStatus,
  ChatShareVisibility,
  MessageRole,
} from '../../../../generated/prisma';

const SUBSTANTIAL = 'A detailed paragraph about configuring production infrastructure. '.repeat(4);

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    threadId: 'thread-1',
    role: MessageRole.USER,
    content: SUBSTANTIAL,
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    routingMode: null,
    routerModel: null,
    usedFallback: false,
    inputTokens: null,
    outputTokens: null,
    estimatedCost: null,
    latencyMs: null,
    feedback: null,
    metadata: null,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  } as ChatMessage;
}

function fourMessages(): ChatMessage[] {
  return [
    makeMessage({ id: 'm1', role: MessageRole.USER }),
    makeMessage({ id: 'm2', role: MessageRole.ASSISTANT }),
    makeMessage({ id: 'm3', role: MessageRole.USER }),
    makeMessage({ id: 'm4', role: MessageRole.ASSISTANT }),
  ];
}

function makeShare(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'share-1',
    threadId: 'thread-1',
    ownerUserId: 'user-1',
    publicShareId: 'AbCdEfGhIjKlMnOpQrStUv',
    status: ChatShareStatus.ACTIVE,
    visibility: ChatShareVisibility.PUBLIC_INDEXED,
    safetyStatus: ChatShareSafetyStatus.APPROVED,
    snapshotVersion: 1,
    title: 'Setup',
    description: null,
    messageCount: 4,
    adsEligible: true,
    publishedAt: new Date('2026-07-01T10:00:00.000Z'),
    lastSnapshotAt: new Date('2026-07-01T10:00:00.000Z'),
    revokedAt: null,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  };
}

type SharesRepoMock = {
  findByThreadId: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  replaceSnapshot: jest.Mock;
  deleteById: jest.Mock;
  listIndexable: jest.Mock;
  revokeForThread: jest.Mock;
  findPublicByShareId: jest.Mock;
};

describe('ChatShareManager', () => {
  let shares: SharesRepoMock;
  let threads: { findById: jest.Mock };
  let messages: { findAllByThreadIdAscending: jest.Mock; countByThreadId: jest.Mock };
  let manager: ChatShareManager;

  beforeEach(() => {
    shares = {
      findByThreadId: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation(async (data: Record<string, unknown>) => makeShare(data)),
      update: jest
        .fn()
        .mockImplementation(async (_id: string, data: Record<string, unknown>) => makeShare(data)),
      replaceSnapshot: jest.fn().mockImplementation(async (_id, _msgs, data) => makeShare(data)),
      deleteById: jest.fn(),
      listIndexable: jest.fn(),
      revokeForThread: jest.fn(),
      findPublicByShareId: jest.fn(),
    };
    threads = {
      findById: jest.fn().mockResolvedValue({ id: 'thread-1', userId: 'user-1', title: 'Setup' }),
    };
    messages = {
      findAllByThreadIdAscending: jest.fn().mockResolvedValue(fourMessages()),
      countByThreadId: jest.fn().mockResolvedValue(4),
    };
    jest
      .spyOn(AppConfig, 'get')
      .mockReturnValue({ PUBLIC_SITE_URL: 'https://claw.local' } as ReturnType<
        typeof AppConfig.get
      >);

    manager = new ChatShareManager(
      shares as unknown as ChatSharesRepository,
      threads as unknown as ChatThreadsRepository,
      messages as unknown as ChatMessagesRepository,
      new ChatShareMapperService(),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ownership', () => {
    it("reports another user's thread as not found, not forbidden", async () => {
      // FORBIDDEN would confirm the thread id exists, turning this into an
      // oracle for enumerating other people's conversations.
      threads.findById.mockResolvedValue({ id: 'thread-1', userId: 'someone-else', title: 'x' });

      await expect(
        manager.publish({ threadId: 'thread-1', userId: 'user-1', allowIndexing: false }),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('refuses to publish a thread that does not exist', async () => {
      threads.findById.mockResolvedValue(null);

      await expect(
        manager.publish({ threadId: 'nope', userId: 'user-1', allowIndexing: false }),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('publish', () => {
    it('mints a cryptographic identifier and builds the canonical URL from config', async () => {
      const view = await manager.publish({
        threadId: 'thread-1',
        userId: 'user-1',
        allowIndexing: true,
      });

      expect(view.publicShareId).toMatch(/^[A-Za-z0-9_-]{22}$/);
      // Origin from configuration, never a request header — a spoofed
      // X-Forwarded-Host must not become a canonical URL.
      expect(view.publicUrl).toBe(`https://claw.local/share/chat/${view.publicShareId}`);
    });

    it('is idempotent for an already-active share', async () => {
      // A double-submit must not leave a customer with two live public URLs
      // for one conversation.
      shares.findByThreadId.mockResolvedValue(makeShare());

      await manager.publish({ threadId: 'thread-1', userId: 'user-1', allowIndexing: true });

      expect(shares.create).not.toHaveBeenCalled();
      expect(shares.replaceSnapshot).not.toHaveBeenCalled();
    });

    it('issues a NEW identifier when re-publishing a revoked share', async () => {
      // Reusing the old one would make a URL somebody already has resolve to
      // content again after the owner deliberately killed it.
      const revoked = makeShare({
        status: ChatShareStatus.REVOKED,
        publicShareId: 'OldIdentifier12345678x',
      });
      shares.findByThreadId.mockResolvedValue(revoked);

      await manager.publish({ threadId: 'thread-1', userId: 'user-1', allowIndexing: false });

      const updateArgs = shares.update.mock.calls[0]?.[1] as {
        publicShareId: string;
        status: string;
      };
      expect(updateArgs.publicShareId).not.toBe('OldIdentifier12345678x');
      expect(updateArgs.status).toBe(ChatShareStatus.ACTIVE);
    });

    it('refuses to publish a thread with nothing publishable in it', async () => {
      messages.findAllByThreadIdAscending.mockResolvedValue([
        makeMessage({ role: MessageRole.SYSTEM }),
      ]);

      await expect(
        manager.publish({ threadId: 'thread-1', userId: 'user-1', allowIndexing: false }),
      ).rejects.toMatchObject({ code: 'EMPTY_THREAD' });
    });

    it('grants indexing only when the snapshot also passes the safety scan', async () => {
      // The owner asking is necessary but not sufficient. A conversation with
      // an apparent credential in it stays unlisted.
      messages.findAllByThreadIdAscending.mockResolvedValue([
        makeMessage({ id: 'm1', content: `${SUBSTANTIAL} sk-${'a'.repeat(40)}` }),
        makeMessage({ id: 'm2', role: MessageRole.ASSISTANT }),
        makeMessage({ id: 'm3' }),
        makeMessage({ id: 'm4', role: MessageRole.ASSISTANT }),
      ]);

      const view = await manager.publish({
        threadId: 'thread-1',
        userId: 'user-1',
        allowIndexing: true,
      });

      expect(view.visibility).toBe(ChatShareVisibility.PUBLIC_UNLISTED);
      expect(view.adsEligible).toBe(false);
    });

    it('leaves a thin conversation unlisted and ad-ineligible', async () => {
      messages.findAllByThreadIdAscending.mockResolvedValue([
        makeMessage({ id: 'm1', content: 'hi' }),
        makeMessage({ id: 'm2', role: MessageRole.ASSISTANT, content: 'hello' }),
      ]);

      const view = await manager.publish({
        threadId: 'thread-1',
        userId: 'user-1',
        allowIndexing: true,
      });

      expect(view.visibility).toBe(ChatShareVisibility.PUBLIC_UNLISTED);
      expect(view.adsEligible).toBe(false);
    });

    it('stays unlisted when the owner did not ask for indexing', async () => {
      const view = await manager.publish({
        threadId: 'thread-1',
        userId: 'user-1',
        allowIndexing: false,
      });

      expect(view.visibility).toBe(ChatShareVisibility.PUBLIC_UNLISTED);
    });
  });

  describe('refresh', () => {
    it('bumps the snapshot version', async () => {
      shares.findByThreadId.mockResolvedValue(makeShare({ snapshotVersion: 3 }));

      await manager.refresh('thread-1', 'user-1');

      const data = shares.replaceSnapshot.mock.calls[0]?.[2] as { snapshotVersion: number };
      expect(data.snapshotVersion).toBe(4);
    });

    it('replaces the whole message set in one call', async () => {
      // Delete-then-insert inside one transaction is what stops a reader
      // seeing a transcript mixing two versions of the conversation.
      shares.findByThreadId.mockResolvedValue(makeShare());

      await manager.refresh('thread-1', 'user-1');

      expect(shares.replaceSnapshot).toHaveBeenCalledTimes(1);
    });

    it('drops an indexed share out of the index when a refresh introduces a secret', async () => {
      // The share does not stay indexed on the strength of its earlier state.
      shares.findByThreadId.mockResolvedValue(
        makeShare({ visibility: ChatShareVisibility.PUBLIC_INDEXED }),
      );
      messages.findAllByThreadIdAscending.mockResolvedValue([
        makeMessage({ id: 'm1', content: `${SUBSTANTIAL} AKIAIOSFODNN7EXAMPLE` }),
        makeMessage({ id: 'm2', role: MessageRole.ASSISTANT }),
        makeMessage({ id: 'm3' }),
        makeMessage({ id: 'm4', role: MessageRole.ASSISTANT }),
      ]);

      await manager.refresh('thread-1', 'user-1');

      const data = shares.replaceSnapshot.mock.calls[0]?.[2] as { visibility: string };
      expect(data.visibility).toBe(ChatShareVisibility.PUBLIC_UNLISTED);
    });

    it('refuses to refresh a revoked share', async () => {
      shares.findByThreadId.mockResolvedValue(makeShare({ status: ChatShareStatus.REVOKED }));

      await expect(manager.refresh('thread-1', 'user-1')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('regenerateUrl', () => {
    it('replaces the identifier, killing the old URL', async () => {
      shares.findByThreadId.mockResolvedValue(
        makeShare({ publicShareId: 'OldOne12345678901234x' }),
      );

      const view = await manager.regenerateUrl('thread-1', 'user-1');

      expect(view.publicShareId).not.toBe('OldOne12345678901234x');
      expect(view.publicShareId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    });
  });

  describe('revoke', () => {
    it('revokes rather than deletes, permanently spending the identifier', async () => {
      // Deleting would free the id to be reissued and later resolve to
      // different content.
      shares.findByThreadId.mockResolvedValue(makeShare());

      await manager.revoke('thread-1', 'user-1');

      expect(shares.deleteById).not.toHaveBeenCalled();
      expect(shares.update).toHaveBeenCalledWith(
        'share-1',
        expect.objectContaining({
          status: ChatShareStatus.REVOKED,
          visibility: ChatShareVisibility.PRIVATE,
          adsEligible: false,
        }),
      );
    });

    it('refuses to revoke twice', async () => {
      shares.findByThreadId.mockResolvedValue(makeShare({ status: ChatShareStatus.REVOKED }));

      await expect(manager.revoke('thread-1', 'user-1')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getForOwner', () => {
    it('returns null when the thread was never shared', async () => {
      await expect(manager.getForOwner('thread-1', 'user-1')).resolves.toBeNull();
    });

    it('flags unpublished messages so the UI can offer a refresh', async () => {
      // The private thread has moved on since the snapshot was taken. Without
      // this the owner would wonder why their newest message is missing.
      shares.findByThreadId.mockResolvedValue(makeShare({ messageCount: 4 }));
      messages.countByThreadId.mockResolvedValue(9);

      const view = await manager.getForOwner('thread-1', 'user-1');

      expect(view?.hasUnpublishedMessages).toBe(true);
    });

    it('reports no unpublished messages when the snapshot is current', async () => {
      shares.findByThreadId.mockResolvedValue(makeShare({ messageCount: 4 }));
      messages.countByThreadId.mockResolvedValue(4);

      const view = await manager.getForOwner('thread-1', 'user-1');

      expect(view?.hasUnpublishedMessages).toBe(false);
    });
  });
});
