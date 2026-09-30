import { vi } from 'vitest';
import { ZodValidationPipe } from '../../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../../common/types';
import { createPromptTemplateSchema } from '../../dto/prompt-library.dto';
import type { PromptLibraryService } from '../../services/prompt-library.service';
import { PromptLibraryController } from '../prompt-library.controller';

const user = { id: 'caller-1', email: 'a@b.c', role: 'USER' } as unknown as AuthenticatedUser;
const ID = '3f2b8c1e-6a4d-4f0e-9b1a-2c7d5e8f9a01';

function build() {
  const library = {
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    create: vi.fn().mockResolvedValue({ id: ID }),
    get: vi.fn().mockResolvedValue({ id: ID }),
    update: vi.fn().mockResolvedValue({ id: ID }),
    remove: vi.fn().mockResolvedValue(undefined),
    use: vi.fn().mockResolvedValue({ id: ID }),
  };
  return {
    library,
    controller: new PromptLibraryController(library as unknown as PromptLibraryService),
  };
}

describe('PromptLibraryController', () => {
  it('uses the authenticated identity on every route', async () => {
    const { library, controller } = build();
    const dto = { title: 't', body: 'b', tags: [], isFavorite: false };
    await controller.list(user, { limit: 30 });
    await controller.create(user, dto);
    await controller.get(user, { id: ID });
    await controller.update(user, { id: ID }, { title: 'x' });
    await controller.remove(user, { id: ID });
    await controller.use(user, { id: ID });
    expect(library.list).toHaveBeenCalledWith('caller-1', { limit: 30 });
    expect(library.create).toHaveBeenCalledWith('caller-1', dto);
    expect(library.get).toHaveBeenCalledWith('caller-1', ID);
    expect(library.update).toHaveBeenCalledWith('caller-1', ID, { title: 'x' });
    expect(library.remove).toHaveBeenCalledWith('caller-1', ID);
    expect(library.use).toHaveBeenCalledWith('caller-1', ID);
  });

  it('remove returns nothing (204)', async () => {
    const { controller } = build();
    await expect(controller.remove(user, { id: ID })).resolves.toBeUndefined();
  });

  it('the body pipe rejects an invalid payload and ignores a smuggled userId', () => {
    const pipe = new ZodValidationPipe(createPromptTemplateSchema);
    expect(() => pipe.transform({ title: '', body: 'b' }, { type: 'body' })).toThrow();
    const parsed = pipe.transform(
      { title: 't', body: 'b', userId: 'victim' },
      { type: 'body' },
    ) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty('userId');
  });
});
