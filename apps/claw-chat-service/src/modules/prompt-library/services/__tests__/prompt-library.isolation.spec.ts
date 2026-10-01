import { BusinessException, EntityNotFoundException } from '../../../../common/errors';
import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { MAX_TEMPLATES_PER_USER } from '../../constants/prompt-library.constants';
import { PromptLibraryErrorCode } from '../../enums/prompt-library-error-code.enum';
import { PromptLibraryRepository } from '../../repositories/prompt-library.repository';
import { PromptLibraryService } from '../prompt-library.service';
import { createFakePromptTemplateDelegate } from './fake-prompt-template.delegate';

function build() {
  const fake = createFakePromptTemplateDelegate();
  const repository = new PromptLibraryRepository(fake.prisma as unknown as PrismaService);
  return { fake, service: new PromptLibraryService(repository) };
}

const input = (title: string) => ({ title, body: 'Hello', tags: [], isFavorite: false });

describe('PromptLibraryService over an in-memory store', () => {
  it('refuses the 201st template for one user but still admits another user', async () => {
    const { fake, service } = build();
    for (let i = 0; i < MAX_TEMPLATES_PER_USER; i += 1) {
      fake.seed('u1', `t${i}`);
    }
    const error = await service.create('u1', input('one too many')).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BusinessException);
    expect((error as BusinessException).code).toBe(PromptLibraryErrorCode.PROMPT_LIBRARY_FULL);
    expect((error as BusinessException).getStatus()).toBe(409);
    expect(fake.count('u1')).toBe(MAX_TEMPLATES_PER_USER);
    await expect(service.create('u2', input('fine'))).resolves.toMatchObject({ title: 'fine' });
  });

  it('answers 404 to another user on get, update, use and delete and changes nothing', async () => {
    const { fake, service } = build();
    const owned = await service.create('owner', input('mine'));
    await expect(service.get('intruder', owned.id)).rejects.toBeInstanceOf(EntityNotFoundException);
    await expect(
      service.update('intruder', owned.id, { title: 'hijacked' }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
    await expect(service.use('intruder', owned.id)).rejects.toBeInstanceOf(EntityNotFoundException);
    await expect(service.remove('intruder', owned.id)).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
    const after = await service.get('owner', owned.id);
    expect(after.title).toBe('mine');
    expect(after.usageCount).toBe(0);
    expect(fake.count('owner')).toBe(1);
  });

  it('never lists another user templates', async () => {
    const { fake, service } = build();
    fake.seed('owner', 'secret');
    const page = await service.list('intruder', { limit: 30 });
    expect(page.items).toEqual([]);
  });

  it('walks every page exactly once: no duplicates, no gaps, stable order', async () => {
    const { fake, service } = build();
    for (let i = 0; i < 25; i += 1) {
      fake.seed('u1', `t${String(i).padStart(2, '0')}`, { isFavorite: i % 5 === 0 });
    }
    const seen: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await service.list('u1', { limit: 10, cursor });
      seen.push(...page.items.map((i) => i.id));
      cursor = page.nextCursor ?? undefined;
      pages += 1;
    } while (cursor !== undefined && pages < 10);
    expect(pages).toBe(3);
    expect(seen).toHaveLength(25);
    expect(new Set(seen).size).toBe(25);
    const again = await service.list('u1', { limit: 25 });
    expect(again.items.map((i) => i.id)).toEqual(seen);
  });

  it('orders favourites first, then most recently used with never-used last', async () => {
    const { fake, service } = build();
    fake.seed('u1', 'plain-never');
    fake.seed('u1', 'plain-used', { lastUsedAt: new Date('2026-09-30T12:00:00Z') });
    fake.seed('u1', 'fav-never', { isFavorite: true });
    const page = await service.list('u1', { limit: 10 });
    expect(page.items.map((i) => i.title)).toEqual(['fav-never', 'plain-used', 'plain-never']);
  });

  it('parallel creates at 199 admit exactly one and never exceed the cap', async () => {
    const { fake, service } = build();
    for (let i = 0; i < MAX_TEMPLATES_PER_USER - 1; i += 1) {
      fake.seed('u1', `t${i}`);
    }
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) => service.create('u1', input(`race${i}`))),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(5);
    for (const r of rejected) {
      expect((r.reason as BusinessException).code).toBe(PromptLibraryErrorCode.PROMPT_LIBRARY_FULL);
    }
    expect(fake.count('u1')).toBe(MAX_TEMPLATES_PER_USER);
  });

  it('parallel creates at 199 admit exactly one and never exceed the cap', async () => {
    const { fake, service } = build();
    for (let i = 0; i < MAX_TEMPLATES_PER_USER - 1; i += 1) {
      fake.seed('u1', `t${i}`);
    }
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) => service.create('u1', input(`race${i}`))),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(5);
    for (const r of rejected) {
      expect((r.reason as BusinessException).code).toBe(PromptLibraryErrorCode.PROMPT_LIBRARY_FULL);
    }
    expect(fake.count('u1')).toBe(MAX_TEMPLATES_PER_USER);
  });
});
