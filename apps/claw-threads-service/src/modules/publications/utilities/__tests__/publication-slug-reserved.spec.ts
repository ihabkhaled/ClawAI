import { PATH_METADATA } from '@nestjs/common/constants';

import { BoardPublicController } from '../../../board/controllers/board-public.controller';
import { PublicationDiscoveryController } from '../../controllers/publication-discovery.controller';
import { RESERVED_PUBLICATION_SLUGS } from '../../constants/publication-title.constants';
import { derivePublicationSlug } from '../publication-title.utility';

const PUBLIC_PREFIX = 'thread-publications/public';

/** Every literal path segment a controller serves directly under `/thread-publications/public/`. */
function literalSegmentsUnderPublic(controller: new (...args: never[]) => unknown): string[] {
  const prefix = String(Reflect.getMetadata(PATH_METADATA, controller));
  const handlers = Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => Reflect.getMetadata(PATH_METADATA, controller.prototype[name]) as unknown);
  const fromPrefix = prefix.startsWith(`${PUBLIC_PREFIX}/`)
    ? [prefix.slice(PUBLIC_PREFIX.length + 1).split('/')[0] ?? '']
    : [];
  const fromHandlers =
    prefix === PUBLIC_PREFIX
      ? handlers.filter((path): path is string => typeof path === 'string')
      : [];
  return [...fromPrefix, ...fromHandlers]
    .map((segment) => segment.split('/')[0] ?? '')
    .filter((segment) => segment !== '' && !segment.startsWith(':'));
}

describe('reserved publication slugs', () => {
  it('names every literal segment the public routes serve before `public/:slug`', () => {
    const segments = [
      ...literalSegmentsUnderPublic(PublicationDiscoveryController),
      ...literalSegmentsUnderPublic(BoardPublicController),
    ];
    expect(segments).toEqual(expect.arrayContaining(['board', 'discover', 'sitemap']));
    for (const segment of segments) {
      expect(RESERVED_PUBLICATION_SLUGS.has(segment)).toBe(true);
    }
  });

  it.each(['board', 'discover', 'sitemap'])('never issues the bare word "%s"', (word) => {
    expect(RESERVED_PUBLICATION_SLUGS.has(word)).toBe(true);
    // A title that is exactly the word still gets the unique part, so the bare word is unreachable.
    expect(derivePublicationSlug(word, 'abcd1234-ffff')).toBe(`${word}-abcd1234`);
    expect(derivePublicationSlug(word.toUpperCase(), 'abcd1234-ffff')).not.toBe(word);
  });

  it('refuses a slug that is a reserved word even if the unique part were empty', () => {
    // The guard that survives a change to the suffix: an id with nothing but dashes.
    const slug = derivePublicationSlug('board', '----');
    expect(slug === null || !RESERVED_PUBLICATION_SLUGS.has(slug)).toBe(true);
  });

  it('keeps every issued slug away from the reserved words', () => {
    for (const title of ['Board', ' board ', 'BOARD!!', 'Discover', 'sitemap', 'The board']) {
      const slug = derivePublicationSlug(title, 'a1b2c3d4-0000');
      expect(slug === null || !RESERVED_PUBLICATION_SLUGS.has(slug)).toBe(true);
    }
  });
});
