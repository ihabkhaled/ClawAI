import { httpGet as sharedHttpGet, httpPost as sharedHttpPost } from '@claw/shared-utilities';
import { httpGet, httpPost } from '../http-client.utility';

jest.mock('@claw/shared-utilities', () => ({
  httpGet: jest.fn(),
  httpPost: jest.fn(),
}));

const mockSharedGet = sharedHttpGet as jest.MockedFunction<typeof sharedHttpGet>;
const mockSharedPost = sharedHttpPost as jest.MockedFunction<typeof sharedHttpPost>;

describe('http-client.utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('httpGet', () => {
    it('forwards url and config to shared httpGet', async () => {
      mockSharedGet.mockResolvedValue({ ok: true });
      const result = await httpGet('http://example/health', { timeout: 1000 });
      expect(mockSharedGet).toHaveBeenCalledWith('http://example/health', { timeout: 1000 });
      expect(result).toEqual({ ok: true });
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
      );
      expect(result).toEqual({ id: 'x' });
    });

    it('propagates errors from shared httpPost', async () => {
      mockSharedPost.mockRejectedValue(new Error('connect refused'));
      await expect(httpPost('http://example/api', {})).rejects.toThrow('connect refused');
    });
  });
});
