import { describe, expect, it, vi } from 'vitest';
import { AccountDeletionService } from '../account-deletion.service';

describe('Thread Generation AccountDeletionService', () => {
  it('validates the event and applies deletion using its stable ID', async () => {
    const repository = { applyDeletion: vi.fn().mockResolvedValue(true) };
    const service = new AccountDeletionService(repository as never);
    const deletedAt = '2026-10-05T12:00:00.000Z';

    await service.handle({ eventId: 'event-1', userId: 'user-1', deletedAt });

    expect(repository.applyDeletion).toHaveBeenCalledWith('user-1', 'event-1', new Date(deletedAt));
  });

  it('rejects malformed events without touching account data', async () => {
    const repository = { applyDeletion: vi.fn() };
    const service = new AccountDeletionService(repository as never);

    await expect(service.handle({ eventId: '', userId: 'user-1' })).rejects.toThrow(
      'Invalid user deletion event',
    );
    expect(repository.applyDeletion).not.toHaveBeenCalled();
  });
});
