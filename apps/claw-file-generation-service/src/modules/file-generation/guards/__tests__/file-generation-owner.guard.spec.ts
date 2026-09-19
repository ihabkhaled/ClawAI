import { vi } from 'vitest';

import { FileGenerationOwnerGuard } from '../file-generation-owner.guard';

const contextFor = (id: string, userId: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ params: { id }, user: { id: userId } }) }),
  }) as never;

describe('FileGenerationOwnerGuard', () => {
  it("admits the generation's owner", async () => {
    const service = { getByIdForUser: vi.fn().mockResolvedValue({ id: 'gen-1' }) };
    await expect(
      new FileGenerationOwnerGuard(service as never).canActivate(contextFor('gen-1', 'u1')),
    ).resolves.toBe(true);
    expect(service.getByIdForUser).toHaveBeenCalledWith('gen-1', 'u1');
  });

  // Live 2026-09-19: the stream answered another user 200 with an error
  // event; refused here, no stream opens at all.
  it('refuses anyone else before a stream opens', async () => {
    const service = {
      getByIdForUser: vi.fn().mockRejectedValue(new Error('File generation not found')),
    };
    await expect(
      new FileGenerationOwnerGuard(service as never).canActivate(contextFor('gen-1', 'u2')),
    ).rejects.toThrow('not found');
  });
});
