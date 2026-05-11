import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  listWebhookDeliveries,
  replayWebhookDelivery,
} from '@/repositories/admin/webhook-deliveries.repository';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe('webhook-deliveries repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listWebhookDeliveries', () => {
    it('omits query string when no filters set', async () => {
      mockGet.mockResolvedValue({ data: [] });
      await listWebhookDeliveries({});
      expect(mockGet).toHaveBeenCalledWith('/workspace/webhooks/deliveries');
    });

    it('appends provider when non-empty', async () => {
      mockGet.mockResolvedValue({ data: [] });
      await listWebhookDeliveries({ provider: 'GITHUB' });
      expect(mockGet).toHaveBeenCalledWith('/workspace/webhooks/deliveries?provider=GITHUB');
    });

    it('skips empty-string provider', async () => {
      mockGet.mockResolvedValue({ data: [] });
      await listWebhookDeliveries({ provider: '' });
      expect(mockGet).toHaveBeenCalledWith('/workspace/webhooks/deliveries');
    });

    it('appends connectorId when non-empty', async () => {
      mockGet.mockResolvedValue({ data: [] });
      await listWebhookDeliveries({ connectorId: 'qa-test' });
      expect(mockGet).toHaveBeenCalledWith('/workspace/webhooks/deliveries?connectorId=qa-test');
    });

    it('serialises signatureValid=true', async () => {
      mockGet.mockResolvedValue({ data: [] });
      await listWebhookDeliveries({ signatureValid: true });
      expect(mockGet).toHaveBeenCalledWith('/workspace/webhooks/deliveries?signatureValid=true');
    });

    it('serialises signatureValid=false', async () => {
      mockGet.mockResolvedValue({ data: [] });
      await listWebhookDeliveries({ signatureValid: false });
      expect(mockGet).toHaveBeenCalledWith('/workspace/webhooks/deliveries?signatureValid=false');
    });

    it('appends limit when set', async () => {
      mockGet.mockResolvedValue({ data: [] });
      await listWebhookDeliveries({ limit: 25 });
      expect(mockGet).toHaveBeenCalledWith('/workspace/webhooks/deliveries?limit=25');
    });

    it('combines multiple params', async () => {
      mockGet.mockResolvedValue({ data: [] });
      await listWebhookDeliveries({
        provider: 'GITHUB',
        connectorId: 'qa',
        signatureValid: true,
        limit: 10,
      });
      const url: string = mockGet.mock.calls[0]?.[0] as string;
      expect(url).toContain('/workspace/webhooks/deliveries?');
      expect(url).toContain('provider=GITHUB');
      expect(url).toContain('connectorId=qa');
      expect(url).toContain('signatureValid=true');
      expect(url).toContain('limit=10');
    });
  });

  describe('replayWebhookDelivery', () => {
    it('posts to encoded path', async () => {
      mockPost.mockResolvedValue({ data: { deliveryId: 'd1' } });
      const result = await replayWebhookDelivery('d1');
      expect(mockPost).toHaveBeenCalledWith('/workspace/webhooks/deliveries/d1/replay');
      expect(result).toEqual({ deliveryId: 'd1' });
    });

    it('url-encodes the id', async () => {
      mockPost.mockResolvedValue({ data: { deliveryId: 'a b' } });
      await replayWebhookDelivery('a b');
      expect(mockPost).toHaveBeenCalledWith('/workspace/webhooks/deliveries/a%20b/replay');
    });
  });
});
