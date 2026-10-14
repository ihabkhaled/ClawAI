import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pluginImportsRepository } from '@/repositories/plugins/plugin-imports.repository';
import { apiClient } from '@/services/shared/api-client';

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ApiClientError: class extends Error {},
}));

const client = vi.mocked(apiClient);

describe('plugin imports repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.post.mockResolvedValue({ data: { kind: 'MARKETPLACE' }, status: 200 });
    client.get.mockResolvedValue({ data: [], status: 200 });
    client.delete.mockResolvedValue({ data: undefined, status: 204 });
  });

  it('previews a GitHub source, sending the folder only when there is one', async () => {
    await pluginImportsRepository.previewGithub('o/r');
    await pluginImportsRepository.previewGithub('o/r', 'plugins/one');

    expect(client.post).toHaveBeenNthCalledWith(1, '/plugins/imports/preview/github', {
      source: 'o/r',
    });
    expect(client.post).toHaveBeenNthCalledWith(2, '/plugins/imports/preview/github', {
      source: 'o/r',
      subdir: 'plugins/one',
    });
  });

  it('uploads the file as multipart under the field the service reads', async () => {
    const file = new File(['zip'], 'plugin.zip');

    await pluginImportsRepository.previewUpload(file, 'sub');

    const [path, body, options] = client.post.mock.calls[0] ?? [];
    expect(path).toBe('/plugins/imports/preview/upload');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBeInstanceOf(File);
    expect((body as FormData).get('subdir')).toBe('sub');
    expect(options).toMatchObject({ timeout: expect.any(Number) });
  });

  it('confirms with the reviewed checksum and an explicit acknowledgement, encoding the id', async () => {
    await pluginImportsRepository.confirm('a/b', 'c'.repeat(64));
    expect(client.post).toHaveBeenCalledWith('/plugins/imports/a%2Fb/confirm', {
      checksum: 'c'.repeat(64),
      acknowledged: true,
    });
  });

  it('lists and removes', async () => {
    await pluginImportsRepository.list();
    await pluginImportsRepository.remove('p1');
    expect(client.get).toHaveBeenCalledWith('/plugins/imports');
    expect(client.delete).toHaveBeenCalledWith('/plugins/imports/p1');
  });
});
