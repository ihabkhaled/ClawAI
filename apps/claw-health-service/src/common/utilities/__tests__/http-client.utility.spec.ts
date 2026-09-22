import { type MockedFunction, vi } from 'vitest';
import { httpGet as sharedHttpGet, httpPost as sharedHttpPost } from '@claw/shared-utilities';
import { httpGet, httpPost } from '../http-client.utility';

vi.mock('@claw/shared-utilities', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
}));

const mockSharedGet = sharedHttpGet as MockedFunction<typeof sharedHttpGet>;
const mockSharedPost = sharedHttpPost as MockedFunction<typeof sharedHttpPost>;

describe('http-client.utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('httpGet', () => {
    it('forwards url and config to shared httpGet', async () => {
      mockSharedGet.mockResolvedValue({ ok: true });
      const result = await httpGet('http://example/health', { timeout: 1000 });
      expect(mockSharedGet).toHaveBeenCalledWith(
        'http://example/health',
        { timeout: 1000 },
        undefined,
      );
      expect(result).toEqual({ ok: true });
    });

    it('forwards allowedHosts to shared httpGet', async () => {
      mockSharedGet.mockResolvedValue({ ok: true });
      const declared = new Set(['runtime.example.com']);
      await httpGet('https://runtime.example.com/x', { timeout: 1000 }, declared);
      expect(mockSharedGet).toHaveBeenCalledWith(
        'https://runtime.example.com/x',
        { timeout: 1000 },
        declared,
      );
    });

    it('propagates errors from shared httpGet', async () => {
      mockSharedGet.mockRejectedValue(new Error('connect refused'));
      await expect(httpGet('http://example/health')).rejects.toThrow('connect refused');
    });
  });

  describe('httpPost', () => {
    it('forwards url, body and config to shared httpPost', async () => {
      mockSharedPost.mockResolvedValue({ id: 'x' });
      const result = await httpPost('http://example/api', { foo: 'bar' }, { timeout: 5000 });
      expect(mockSharedPost).toHaveBeenCalledWith(
        'http://example/api',
        { foo: 'bar' },
        { timeout: 5000 },
        undefined,
      );
      expect(result).toEqual({ id: 'x' });
    });

    it('forwards allowedHosts to shared httpPost', async () => {
      mockSharedPost.mockResolvedValue({ id: 'x' });
      const declared = new Set(['runtime.example.com']);
      await httpPost('https://runtime.example.com/x', { foo: 'bar' }, undefined, declared);
      expect(mockSharedPost).toHaveBeenCalledWith(
        'https://runtime.example.com/x',
        { foo: 'bar' },
        undefined,
        declared,
      );
    });

    it('propagates errors from shared httpPost', async () => {
      mockSharedPost.mockRejectedValue(new Error('connect refused'));
      await expect(httpPost('http://example/api', {})).rejects.toThrow('connect refused');
    });
  });
});
