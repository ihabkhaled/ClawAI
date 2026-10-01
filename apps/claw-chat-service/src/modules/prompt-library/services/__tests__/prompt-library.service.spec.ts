import { vi } from 'vitest';
import { BusinessException, EntityNotFoundException } from '../../../../common/errors';
import {
  MAX_TAG_SUMMARIES,
  MAX_TEMPLATES_PER_USER,
} from '../../constants/prompt-library.constants';
import { PromptLibraryErrorCode } from '../../enums/prompt-library-error-code.enum';
import type { PromptLibraryRepository } from '../../repositories/prompt-library.repository';
import type { PromptTemplateRecord } from '../../types/prompt-library.types';
import { PromptLibraryService } from '../prompt-library.service';

function record(overrides: Partial<PromptTemplateRecord> = {}): PromptTemplateRecord {
  return {
    id: 't1',
    userId: 'u1',
    title: 'Title',
    body: 'Hello {{name}}',
    tags: ['work'],
    isFavorite: false,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date('2026-09-30T10:00:00.000Z'),
    updatedAt: new Date('2026-09-30T10:00:00.000Z'),
    ...overrides,
  };
}

function build() {
  const repo = {
    createWithinLimit: vi.fn().mockResolvedValue(record()),
    listTags: vi.fn().mockResolvedValue([]),
    findOwned: vi.fn().mockResolvedValue(record()),
    list: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(record()),
    delete: vi.fn().mockResolvedValue(true),
    recordUse: vi.fn().mockResolvedValue(record({ usageCount: 1 })),
  };
  return { repo, service: new PromptLibraryService(repo as unknown as PromptLibraryRepository) };
}

describe('PromptLibraryService', () => {
  it('create stores for the caller and returns the variables', async () => {
    const { repo, service } = build();
    const view = await service.create('u1', {
      title: 'Title',
      body: 'Hello {{name}}',
      tags: ['work'],
      isFavorite: false,
    });
    expect(repo.createWithinLimit).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
      MAX_TEMPLATES_PER_USER,
    );
    expect(view.variables).toEqual(['name']);
    expect(view.lastUsedAt).toBeNull();
  });

  it('create refuses at the per-user limit with 409 PROMPT_LIBRARY_FULL', async () => {
    const { repo, service } = build();
    repo.createWithinLimit.mockResolvedValue(null);
    const error = await service
      .create('u1', { title: 't', body: 'b', tags: [], isFavorite: false })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BusinessException);
    expect((error as BusinessException).code).toBe(PromptLibraryErrorCode.PROMPT_LIBRARY_FULL);
    expect((error as BusinessException).getStatus()).toBe(409);
    expect(repo.createWithinLimit).toHaveBeenCalled();
  });

  it('create rejects a malformed template before touching the database', async () => {
    const { repo, service } = build();
    await expect(
      service.create('u1', { title: 't', body: '{{oops', tags: [], isFavorite: false }),
    ).rejects.toMatchObject({ code: PromptLibraryErrorCode.PROMPT_TEMPLATE_INVALID });
    expect(repo.createWithinLimit).not.toHaveBeenCalled();
  });

  it('get, update, remove and use answer 404 for a template the caller does not own', async () => {
    const { repo, service } = build();
    repo.findOwned.mockResolvedValue(null);
    repo.update.mockResolvedValue(null);
    repo.delete.mockResolvedValue(false);
    repo.recordUse.mockResolvedValue(null);
    await expect(service.get('u1', 't1')).rejects.toBeInstanceOf(EntityNotFoundException);
    await expect(service.update('u1', 't1', { title: 'x' })).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
    await expect(service.remove('u1', 't1')).rejects.toBeInstanceOf(EntityNotFoundException);
    await expect(service.use('u1', 't1')).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('update validates a new body and skips validation when the body is untouched', async () => {
    const { repo, service } = build();
    await expect(service.update('u1', 't1', { body: '{{Bad}}' })).rejects.toBeInstanceOf(
      BusinessException,
    );
    expect(repo.update).not.toHaveBeenCalled();
    await service.update('u1', 't1', { isFavorite: true });
    expect(repo.update).toHaveBeenCalledWith('t1', 'u1', { isFavorite: true });
  });

  it('remove resolves when the owner row was deleted', async () => {
    const { service } = build();
    await expect(service.remove('u1', 't1')).resolves.toBeUndefined();
  });

  it('use returns the bumped template', async () => {
    const { repo, service } = build();
    const view = await service.use('u1', 't1');
    expect(repo.recordUse).toHaveBeenCalledWith('t1', 'u1');
    expect(view.usageCount).toBe(1);
  });

  it('list returns a nextCursor only when there is another page, and follows it', async () => {
    const { repo, service } = build();
    repo.list.mockResolvedValueOnce([record({ id: 'a' }), record({ id: 'b' })]);
    const first = await service.list('u1', { limit: 1 });
    expect(first.items.map((i) => i.id)).toEqual(['a']);
    expect(first.nextCursor).not.toBeNull();

    repo.list.mockResolvedValueOnce([record({ id: 'b' })]);
    const second = await service.list('u1', { limit: 1, cursor: first.nextCursor ?? undefined });
    expect(repo.list).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 1, limit: 1 }));
    expect(second.nextCursor).toBeNull();
  });

  it('list passes search filters through and treats a garbage cursor as page one', async () => {
    const { repo, service } = build();
    await service.list('u1', { limit: 5, q: 'plan', tag: 'work', favorite: true, cursor: '!!' });
    expect(repo.list).toHaveBeenCalledWith({
      userId: 'u1',
      q: 'plan',
      tag: 'work',
      favorite: true,
      offset: 0,
      limit: 5,
    });
  });

  it('tags returns the caller tag counts capped at the limit', async () => {
    const { repo, service } = build();
    repo.listTags.mockResolvedValue([{ tag: 'work', count: 3 }]);
    await expect(service.tags('u1')).resolves.toEqual({ items: [{ tag: 'work', count: 3 }] });
    expect(repo.listTags).toHaveBeenCalledWith('u1', MAX_TAG_SUMMARIES);
  });

  it('tags returns the caller tag counts capped at the limit', async () => {
    const { repo, service } = build();
    repo.listTags.mockResolvedValue([{ tag: 'work', count: 3 }]);
    await expect(service.tags('u1')).resolves.toEqual({ items: [{ tag: 'work', count: 3 }] });
    expect(repo.listTags).toHaveBeenCalledWith('u1', MAX_TAG_SUMMARIES);
  });
});
