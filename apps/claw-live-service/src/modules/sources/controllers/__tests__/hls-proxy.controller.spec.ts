import { Readable } from 'node:stream';

import { HlsProxyController } from '../hls-proxy.controller';

describe('HlsProxyController', () => {
  it('streams the reply with no-store and nosniff headers', async () => {
    const proxy = {
      file: vi
        .fn()
        .mockResolvedValue({ contentType: 'video/mp2t', body: Readable.from([Buffer.from('a')]) }),
      proxied: vi.fn().mockResolvedValue({
        contentType: 'application/vnd.apple.mpegurl',
        body: Readable.from([Buffer.from('b')]),
      }),
    };
    const controller = new HlsProxyController(proxy as never);
    const pipeTarget = () => {
      const headers = new Map<string, string>();
      return {
        headers,
        status: vi.fn(),
        setHeader: vi.fn((name: string, value: string) => headers.set(name, value)),
        on: vi.fn(),
        once: vi.fn(),
        emit: vi.fn(),
        write: vi.fn(() => true),
        end: vi.fn(),
      };
    };
    const response = pipeTarget();
    await controller.file('st1', 'seg1.ts', { id: 'u1' } as never, response as never);
    expect(proxy.file).toHaveBeenCalledWith('st1', 'u1', 'seg1.ts');
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.headers.get('content-type')).toBe('video/mp2t');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    const second = pipeTarget();
    await controller.proxied('st1', 'abc', { id: 'u2' } as never, second as never);
    expect(proxy.proxied).toHaveBeenCalledWith('st1', 'u2', 'abc');
  });
});
