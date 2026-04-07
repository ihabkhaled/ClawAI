import { beforeEach, describe, expect, it, vi } from 'vitest';

import { chatRepository } from '@/repositories/chat/chat.repository';
import type { ChatMessage, ChatThread, MessagesListResponse, ThreadsListResponse } from '@/types';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const mockThread: ChatThread = {
  id: 'thread-1',
  userId: 'user-1',
  title: 'Test Thread',
  routingMode: 'MANUAL' as ChatThread['routingMode'],
  lastProvider: null,
  lastModel: null,
  preferredProvider: null,
  preferredModel: null,
  isPinned: false,
  isArchived: false,
  systemPrompt: null,
  temperature: 0.7,
  maxTokens: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockMessage: ChatMessage = {
  id: 'msg-1',
  threadId: 'thread-1',
  role: 'USER' as ChatMessage['role'],
  content: 'Hello',
  provider: null,
  model: null,
  routingMode: null,
  routerModel: null,
  usedFallback: false,
  inputTokens: null,
  outputTokens: null,
  feedback: null,
  latencyMs: null,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('chatRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- createThread ----------

  describe('createThread', () => {
    it('posts to /chat-threads and returns the thread', async () => {
      mockPost.mockResolvedValueOnce({ data: mockThread, status: 201 });

      const result = await chatRepository.createThread({ title: 'Test Thread' });

      expect(mockPost).toHaveBeenCalledWith('/chat-threads', {
        title: 'Test Thread',
      });
      expect(result).toEqual(mockThread);
    });

    it('propagates errors from apiClient', async () => {
      mockPost.mockRejectedValueOnce(new Error('Server error'));

      await expect(chatRepository.createThread({ title: 'Fail' })).rejects.toThrow('Server error');
    });
  });

  // ---------- getThreads ----------

  describe('getThreads', () => {
    it('gets /chat-threads and returns the list response', async () => {
      const listResponse: ThreadsListResponse = {
        data: [mockThread],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockGet.mockResolvedValueOnce({ data: listResponse, status: 200 });

      const result = await chatRepository.getThreads();

      expect(mockGet).toHaveBeenCalledWith('/chat-threads', undefined);
      expect(result).toEqual(listResponse);
    });

    it('passes query params when provided', async () => {
      const listResponse: ThreadsListResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      mockGet.mockResolvedValueOnce({ data: listResponse, status: 200 });

      await chatRepository.getThreads({ page: '1', limit: '10' });

      expect(mockGet).toHaveBeenCalledWith('/chat-threads', {
        page: '1',
        limit: '10',
      });
    });
  });

  // ---------- getThread ----------

  describe('getThread', () => {
    it('gets /chat-threads/:id and returns the thread', async () => {
      mockGet.mockResolvedValueOnce({ data: mockThread, status: 200 });

      const result = await chatRepository.getThread('thread-1');

      expect(mockGet).toHaveBeenCalledWith('/chat-threads/thread-1');
      expect(result).toEqual(mockThread);
    });

    it('propagates errors from apiClient', async () => {
      mockGet.mockRejectedValueOnce(new Error('Not found'));

      await expect(chatRepository.getThread('bad-id')).rejects.toThrow('Not found');
    });
  });

  // ---------- createMessage ----------

  describe('createMessage', () => {
    it('posts to /chat-messages with threadId and content', async () => {
      mockPost.mockResolvedValueOnce({ data: mockMessage, status: 201 });

      const result = await chatRepository.createMessage({
        threadId: 'thread-1',
        content: 'Hello',
      });

      expect(mockPost).toHaveBeenCalledWith('/chat-messages', {
        threadId: 'thread-1',
        content: 'Hello',
      });
      expect(result).toEqual(mockMessage);
    });

    it('propagates errors from apiClient', async () => {
      mockPost.mockRejectedValueOnce(new Error('Send failed'));

      await expect(
        chatRepository.createMessage({
          threadId: 'thread-1',
          content: 'Hello',
        }),
      ).rejects.toThrow('Send failed');
    });
  });

  // ---------- getMessages ----------

  describe('getMessages', () => {
    it('gets /chat-messages/thread/:threadId and returns messages', async () => {
      const messagesResponse: MessagesListResponse = {
        data: [mockMessage],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };
      mockGet.mockResolvedValueOnce({ data: messagesResponse, status: 200 });

      const result = await chatRepository.getMessages('thread-1');

      expect(mockGet).toHaveBeenCalledWith('/chat-messages/thread/thread-1', undefined);
      expect(result).toEqual(messagesResponse);
    });

    it('passes query params when provided', async () => {
      const messagesResponse: MessagesListResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockGet.mockResolvedValueOnce({ data: messagesResponse, status: 200 });

      await chatRepository.getMessages('thread-1', { page: '2' });

      expect(mockGet).toHaveBeenCalledWith('/chat-messages/thread/thread-1', {
        page: '2',
      });
    });
  });

  // ---------- updateThread ----------

  describe('updateThread', () => {
    it('patches /chat-threads/:id and returns the updated thread', async () => {
      const updated = { ...mockThread, title: 'Updated' };
      mockPatch.mockResolvedValueOnce({ data: updated, status: 200 });

      const result = await chatRepository.updateThread('thread-1', {
        title: 'Updated',
      });

      expect(mockPatch).toHaveBeenCalledWith('/chat-threads/thread-1', {
        title: 'Updated',
      });
      expect(result).toEqual(updated);
    });
  });

  // ---------- deleteThread ----------

  describe('deleteThread', () => {
    it('deletes /chat-threads/:id', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined, status: 204 });

      await chatRepository.deleteThread('thread-1');

      expect(mockDelete).toHaveBeenCalledWith('/chat-threads/thread-1');
    });

    it('propagates errors from apiClient', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(chatRepository.deleteThread('thread-1')).rejects.toThrow('Delete failed');
    });
  });
});
