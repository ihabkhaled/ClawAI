import { ChatShareMapperService } from '../chat-share-mapper.service';
import {
  type ChatShare,
  type ChatShareMessage,
  type ChatShareMessageAsset,
  ChatShareSafetyStatus,
  ChatShareStatus,
  ChatShareVisibility,
  MessageRole,
} from '../../../../generated/prisma';

const SHARE = {
  id: 'internal-share-row-id',
  // Everything on these three lines is private and must never appear in a
  // public response.
  threadId: 'PRIVATE-THREAD-ID',
  ownerUserId: 'PRIVATE-OWNER-USER-ID',
  safetyStatus: ChatShareSafetyStatus.APPROVED,
  publicShareId: 'AbCdEfGhIjKlMnOpQrStUv',
  status: ChatShareStatus.ACTIVE,
  visibility: ChatShareVisibility.PUBLIC_INDEXED,
  snapshotVersion: 3,
  title: 'Reverse proxy setup',
  description: 'How do I configure nginx as a reverse proxy?',
  messageCount: 6,
  adsEligible: true,
  indexEligible: true,
  contentLocale: 'en',
  publishedAt: new Date('2026-07-01T10:00:00.000Z'),
  lastSnapshotAt: new Date('2026-07-20T09:00:00.000Z'),
  revokedAt: null,
  createdAt: new Date('2026-07-01T10:00:00.000Z'),
  updatedAt: new Date('2026-07-20T09:00:00.000Z'),
} as unknown as ChatShare;

const MESSAGE = {
  id: 'INTERNAL-ROW-ID',
  chatShareId: 'internal-share-row-id',
  publicMessageId: 'public-message-uuid',
  sequence: 0,
  role: MessageRole.USER,
  content: 'How do I configure nginx?',
  providerLabel: 'anthropic',
  modelLabel: 'claude-sonnet-4',
  originalCreatedAt: new Date('2026-07-01T10:00:00.000Z'),
  createdAt: new Date('2026-07-20T09:00:00.000Z'),
  assets: [
    {
      id: 'ASSET-ROW-ID',
      chatShareMessageId: 'msg-row-1',
      publicAssetId: 'e6b0f1c2-0000-4000-8000-000000000001',
      // The private handle onto file-service storage. Asserted below to never
      // appear in the public payload.
      storedFileId: 'PRIVATE-STORED-FILE-ID',
      mimeType: 'image/png',
      byteSize: 2048,
      altText: null,
      sequence: 0,
      scanStatus: 'PENDING',
      scanReason: null,
      scannedAt: null,
      createdAt: new Date('2026-07-20T09:00:00.000Z'),
    },
  ],
} as unknown as ChatShareMessage & { assets: ChatShareMessageAsset[] };

describe('ChatShareMapperService', () => {
  const mapper = new ChatShareMapperService();

  describe('toPublicResponse', () => {
    const response = mapper.toPublicResponse({ ...SHARE, messages: [MESSAGE] });
    const serialized = JSON.stringify(response);

    it('never exposes the owner user id', () => {
      expect(serialized).not.toContain('PRIVATE-OWNER-USER-ID');
      expect(Object.keys(response)).not.toContain('ownerUserId');
    });

    it('never exposes the private thread id', () => {
      expect(serialized).not.toContain('PRIVATE-THREAD-ID');
      expect(Object.keys(response)).not.toContain('threadId');
    });

    it('never exposes internal row ids', () => {
      // A spread would have published both of these, and would keep publishing
      // every column added to the model in future.
      expect(serialized).not.toContain('internal-share-row-id');
      expect(serialized).not.toContain('INTERNAL-ROW-ID');
    });

    it('never exposes the safety status', () => {
      // Moderation state is internal. Publishing it tells a reader the page was
      // reviewed and how.
      expect(Object.keys(response)).not.toContain('safetyStatus');
    });

    it('publishes the public message id, not the row id', () => {
      expect(response.messages[0]?.id).toBe('public-message-uuid');
    });

    it('exposes exactly the approved message fields', () => {
      // An explicit list, not a subset check: this is the allow-list itself, so
      // a field appearing here without somebody editing this line is exactly
      // what it exists to catch. `assets` was added deliberately in ADR-075.
      expect(Object.keys(response.messages[0] ?? {}).sort()).toEqual([
        'assets',
        'content',
        'createdAt',
        'id',
        'modelLabel',
        'providerLabel',
        'role',
        'sequence',
      ]);
    });

    it('dates the message when it was originally sent', () => {
      // Not when it was copied into the snapshot — the transcript should read
      // in the time it happened.
      expect(response.messages[0]?.createdAt).toBe('2026-07-01T10:00:00.000Z');
    });

    it('carries the server-derived ad eligibility', () => {
      // The page must not decide for itself that it may show ads.
      expect(response.adsEligible).toBe(true);
    });

    it('carries visibility so the page can set correct robots metadata', () => {
      expect(response.visibility).toBe(ChatShareVisibility.PUBLIC_INDEXED);
    });
  });

  describe('toOwnerView', () => {
    it('gives the owner their public URL and safety status', () => {
      const view = mapper.toOwnerView(SHARE, 'https://claw.local/share/chat/AbCd', false);

      expect(view.publicUrl).toBe('https://claw.local/share/chat/AbCd');
      // The owner MAY see the safety status — it explains why their chat is
      // unlisted rather than indexed.
      expect(view.safetyStatus).toBe(ChatShareSafetyStatus.APPROVED);
    });

    it('still withholds the owner user id and thread id', () => {
      const view = mapper.toOwnerView(SHARE, 'https://claw.local/share/chat/AbCd', true);
      const keys = Object.keys(view);

      expect(keys).not.toContain('ownerUserId');
      expect(keys).not.toContain('threadId');
    });

    it('reports unpublished messages so the UI can offer a refresh', () => {
      const view = mapper.toOwnerView(SHARE, 'https://claw.local/share/chat/AbCd', true);
      expect(view.hasUnpublishedMessages).toBe(true);
    });
  });

  describe('published assets', () => {
    const response = mapper.toPublicResponse({ ...SHARE, messages: [MESSAGE] });
    const serialized = JSON.stringify(response);

    it('publishes the public handle so the image can render', () => {
      expect(response.messages[0]?.assets[0]?.publicAssetId).toBe(
        'e6b0f1c2-0000-4000-8000-000000000001',
      );
      expect(response.messages[0]?.assets[0]?.mimeType).toBe('image/png');
    });

    it('never exposes the private stored file id', () => {
      // The whole point of the copy indirection: the public handle resolves
      // only through the share that owns it, and the storage id never leaves.
      expect(serialized).not.toContain('PRIVATE-STORED-FILE-ID');
      expect(serialized).not.toContain('storedFileId');
    });

    it('never exposes the scan verdict, which gates our inventory not their reading', () => {
      expect(serialized).not.toContain('scanStatus');
      expect(serialized).not.toContain('scanReason');
    });
  });
});
