import { Locale } from '@claw/shared-types';

import { PublicationTranslationWorkerService } from '../publication-translation-worker.service';
import { TranslationModelError } from '../translation-model.client';

const target = {
  publicationId: 'pub-1',
  locale: Locale.AR,
  sourceLocale: Locale.EN,
  revision: 2,
};
const source = { title: 'A title', markdown: `# A title\n\n${'Some real sentence. '.repeat(30)}` };

function create() {
  const repository = {
    findDue: vi.fn().mockResolvedValue([target]),
    claim: vi.fn().mockResolvedValue('row-1'),
    loadSource: vi.fn().mockResolvedValue(source),
    complete: vi.fn().mockResolvedValue(true),
    fail: vi.fn().mockResolvedValue(undefined),
  };
  const model = {
    complete: vi.fn().mockImplementation(async (_system: string, prompt: string) => ({
      model: 'GEMINI:gemma-4-31b-it',
      content: prompt.includes('TITLE:')
        ? `TITLE:\nعنوان\n\nBODY:\n# عنوان\n\n${'جملة حقيقية. '.repeat(30)}`
        : 'ترجمة',
    })),
  };
  return {
    repository,
    model,
    service: new PublicationTranslationWorkerService(repository as never, model as never),
  };
}

describe('PublicationTranslationWorkerService', () => {
  it('translates a due pair and stores it against the revision it was made from', async () => {
    const { service, repository } = create();

    await expect(service.runOnce()).resolves.toEqual({ claimed: 1, ready: 1, failed: 0 });

    expect(repository.claim).toHaveBeenCalledWith(target);
    expect(repository.complete).toHaveBeenCalledWith(
      'row-1',
      2,
      expect.objectContaining({ title: 'عنوان', model: 'GEMINI:gemma-4-31b-it' }),
    );
  });

  it('skips a pair another replica already holds', async () => {
    const { service, repository, model } = create();
    repository.claim.mockResolvedValue(null);

    await expect(service.runOnce()).resolves.toEqual({ claimed: 0, ready: 0, failed: 0 });
    expect(model.complete).not.toHaveBeenCalled();
  });

  it('records a stable failure code when every model fails, and keeps going', async () => {
    const { service, repository, model } = create();
    model.complete.mockRejectedValue(new TranslationModelError('MODEL_HTTP_429'));

    await expect(service.runOnce()).resolves.toEqual({ claimed: 1, ready: 0, failed: 1 });
    expect(repository.fail).toHaveBeenCalledWith('row-1', 2, 'MODEL_HTTP_429');
    expect(repository.complete).not.toHaveBeenCalled();
  });

  it('fails a reply that is not in the title-and-body shape', async () => {
    const { service, repository, model } = create();
    model.complete.mockResolvedValue({ model: 'm', content: 'no markers at all' });

    await service.runOnce();

    expect(repository.fail).toHaveBeenCalledWith('row-1', 2, 'BAD_TITLE_SHAPE');
  });

  it('fails a truncated translation instead of publishing it', async () => {
    const { service, repository, model } = create();
    model.complete.mockResolvedValue({ model: 'm', content: 'TITLE:\nt\n\nBODY:\nx' });

    await service.runOnce();

    expect(repository.fail).toHaveBeenCalledWith('row-1', 2, 'IMPLAUSIBLE_TRANSLATION');
  });

  it('marks a pair whose revision is no longer public as changed', async () => {
    const { service, repository } = create();
    repository.loadSource.mockResolvedValue(null);

    await service.runOnce();

    expect(repository.fail).toHaveBeenCalledWith('row-1', 2, 'SOURCE_CHANGED');
  });

  it('never throws when the database is down', async () => {
    const { service, repository } = create();
    repository.findDue.mockRejectedValue(new Error('db down'));

    await expect(service.runOnce()).resolves.toEqual({ claimed: 0, ready: 0, failed: 0 });
    await expect(service.runOnce()).resolves.toBeDefined();
  });
});
