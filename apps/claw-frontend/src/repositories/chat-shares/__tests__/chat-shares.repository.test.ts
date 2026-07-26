import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';

import { chatSharesRepository } from '../chat-shares.repository';

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const { apiClient } = await import('@/services/shared/api-client');

const mocked = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const SHARE = {
  publicShareId: 'abc123',
  publicUrl: 'https://claw.local/share/chat/abc123',
  status: 'ACTIVE',
  visibility: 'PUBLIC_UNLISTED',
  safetyStatus: 'PENDING',
  snapshotVersion: 1,
  title: 'Shared conversation',
  messageCount: 2,
  adsEligible: false,
  publishedAt: '2026-07-26T16:32:44.671Z',
  lastSnapshotAt: '2026-07-26T16:32:44.671Z',
  hasUnpublishedMessages: false,
};

describe('chatSharesRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('publish', () => {
    /**
     * The backend declares `acknowledgedPublicWarning: z.literal(true)`. Sending
     * the body without it is a 400 on every publish, and because no share row is
     * ever created, every follow-up call (refresh, regenerate, PATCH) then 404s.
     * The whole feature is dead from one missing field, so the field is pinned
     * here rather than left to the type alone.
     */
    it('sends the acknowledgement the backend requires', async () => {
      mocked.post.mockResolvedValue({ data: SHARE });

      await chatSharesRepository.publish('thread-1', {
        allowIndexing: false,
        acknowledgedPublicWarning: true,
        contentLocale: Locale.EN,
      });

      expect(mocked.post).toHaveBeenCalledWith('/chat-threads/thread-1/share', {
        allowIndexing: false,
        acknowledgedPublicWarning: true,
        contentLocale: Locale.EN,
      });
    });

    it('forwards the indexing preference unchanged', async () => {
      mocked.post.mockResolvedValue({ data: SHARE });

      await chatSharesRepository.publish('thread-1', {
        allowIndexing: true,
        acknowledgedPublicWarning: true,
        contentLocale: Locale.EN,
      });

      expect(mocked.post).toHaveBeenCalledWith(
        '/chat-threads/thread-1/share',
        expect.objectContaining({ allowIndexing: true }),
      );
    });
  });

  describe('updateIndexing', () => {
    /**
     * The PATCH schema accepts `allowIndexing` alone. Re-sending the
     * acknowledgement on a toggle would imply the publication warning is being
     * re-consented to on every switch flip, which it is not.
     */
    it('sends only the indexing flag', async () => {
      mocked.patch.mockResolvedValue({ data: SHARE });

      await chatSharesRepository.updateIndexing('thread-1', { allowIndexing: true });

      expect(mocked.patch).toHaveBeenCalledWith('/chat-threads/thread-1/share', {
        allowIndexing: true,
      });
    });
  });

  describe('get', () => {
    /**
     * NestJS serialises a `null` return as an empty body, which the HTTP client
     * surfaces as `''`. `'' ?? null` is `''` — truthy enough to read as "this
     * thread IS shared", which is how the dialog came to render a published
     * state, a blank public link and five buttons that all 404'd, for threads
     * that had never been shared.
     */
    it.each([['' as unknown], [null], [undefined], [{}], [{ publicShareId: '' }]])(
      'returns null for a body that carries no share id (%p)',
      async (body) => {
        mocked.get.mockResolvedValue({ data: body });

        await expect(chatSharesRepository.get('thread-1')).resolves.toBeNull();
      },
    );

    it('returns the share when one exists', async () => {
      mocked.get.mockResolvedValue({ data: SHARE });

      await expect(chatSharesRepository.get('thread-1')).resolves.toEqual(SHARE);
    });
  });

  describe('lifecycle endpoints', () => {
    it('posts to the refresh path', async () => {
      mocked.post.mockResolvedValue({ data: SHARE });

      await chatSharesRepository.refresh('thread-1');

      expect(mocked.post).toHaveBeenCalledWith('/chat-threads/thread-1/share/refresh');
    });

    it('posts to the regenerate path', async () => {
      mocked.post.mockResolvedValue({ data: SHARE });

      await chatSharesRepository.regenerateUrl('thread-1');

      expect(mocked.post).toHaveBeenCalledWith('/chat-threads/thread-1/share/regenerate-url');
    });

    it('deletes the share', async () => {
      mocked.delete.mockResolvedValue({ data: undefined });

      await chatSharesRepository.revoke('thread-1');

      expect(mocked.delete).toHaveBeenCalledWith('/chat-threads/thread-1/share');
    });
  });
});
