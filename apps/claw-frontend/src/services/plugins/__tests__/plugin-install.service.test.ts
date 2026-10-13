import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pluginInstallsRepository } from '@/repositories/plugins/plugin-installs.repository';

import { PluginCredentialSaveError } from '../plugin-credential-save-error';
import { installPluginWithCredential } from '../plugin-install.service';

vi.mock('@/repositories/plugins/plugin-installs.repository', () => ({
  pluginInstallsRepository: { install: vi.fn(), putCredential: vi.fn() },
}));

const install = vi.mocked(pluginInstallsRepository.install);
const putCredential = vi.mocked(pluginInstallsRepository.putCredential);

describe('installPluginWithCredential', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    install.mockResolvedValue({ id: 'i1' } as never);
    putCredential.mockResolvedValue({ hasCredential: true } as never);
  });

  it('installs without touching the credential endpoint when no key was typed', async () => {
    const result = await installPluginWithCredential({
      request: { slug: 'weather' },
      credential: '',
    });
    expect(result).toEqual({ id: 'i1' });
    expect(putCredential).not.toHaveBeenCalled();
  });

  it('stores the key against the new install id', async () => {
    await installPluginWithCredential({ request: { slug: 'news' }, credential: 'k-123' });
    expect(install).toHaveBeenCalledWith({ slug: 'news' });
    expect(putCredential).toHaveBeenCalledWith('i1', { kind: 'API_KEY', value: 'k-123' });
  });

  it('wraps a failed key call with the install that already exists', async () => {
    const denied = new Error('denied');
    putCredential.mockRejectedValue(denied);
    const failure = await installPluginWithCredential({
      request: { slug: 'news' },
      credential: 'k',
    }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(PluginCredentialSaveError);
    expect((failure as PluginCredentialSaveError).install).toEqual({ id: 'i1' });
    expect((failure as PluginCredentialSaveError).cause).toBe(denied);
    expect(install).toHaveBeenCalledTimes(1);
  });

  it('does not store a key when the install itself fails', async () => {
    install.mockRejectedValue(new Error('limit'));
    await expect(
      installPluginWithCredential({ request: { slug: 'news' }, credential: 'k' }),
    ).rejects.toThrow('limit');
    expect(putCredential).not.toHaveBeenCalled();
  });
});
