import { PublicationsRepository } from '../publications.repository';

describe('PublicationsRepository.findPublic source markers (ADR-183)', () => {
  it('numbers known markers, drops unknown ones and never exposes an evidence id', async () => {
    const threadPublication = {
      findFirst: vi.fn().mockResolvedValue({
        slug: 'opaque-slug',
        contentLocale: 'ar',
        publicationType: 'article',
        publishedAt: new Date('2026-10-05T12:00:00.000Z'),
        ownerId: 'private-owner',
        viewCount: 0,
        readerCount: 0,
        revisions: [
          {
            title: 'Public article',
            content: {
              markdown:
                'نص [a5505c418699ab68] ثم [0123456789abcdef] ثم 【2f25f199712eec3d】 [https://example.test/source]',
              citations: [
                { evidenceId: 'a5505c418699ab68', url: 'https://example.test/source' },
                { evidenceId: '2f25f199712eec3d', url: 'https://example.test/two' },
              ],
            },
          },
        ],
      }),
    };
    const repository = new PublicationsRepository({ threadPublication } as never);

    const publication = await repository.findPublic('opaque-slug');

    expect(publication?.content.markdown).toBe('نص [1] ثم ثم [2] [1]');
    expect(JSON.stringify(publication)).not.toContain('a5505c418699ab68');
    expect(publication?.content.citations).toEqual([
      { url: 'https://example.test/source' },
      { url: 'https://example.test/two' },
    ]);
  });
});
