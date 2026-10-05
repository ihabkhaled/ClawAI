import { publicationExcerpt } from '../publication-excerpt.utility';

describe('publicationExcerpt', () => {
  it('removes markdown presentation and links from a short public preview', () => {
    expect(publicationExcerpt('# Heading\n\nA **useful** [source](https://example.test).')).toBe(
      'A useful source.',
    );
  });

  it('bounds the excerpt length', () => {
    expect(publicationExcerpt('A'.repeat(400))).toHaveLength(280);
  });
});
