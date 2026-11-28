import { describe, expect, it, vi } from 'vitest';

import {
  PlatformAccessMethod,
  PlatformApiKind,
  PlatformCategory,
} from '../../../../generated/prisma';
import { PLATFORM_SLUG_PATTERN } from '../../constants/platform-admin.constants';
import { PLATFORM_SEED } from '../../constants/platform-seed.constants';
import { isPlatformDomain, platformShapeError } from '../../utilities/platform-shape.utility';
import { ResearchPlatformBootstrapService } from '../research-platform-bootstrap.service';

const build = (existingSlugs: string[]) => {
  const repository = {
    listSlugs: vi.fn(async () => existingSlugs),
    createMissing: vi.fn(async (rows: unknown[]) => rows.length),
    update: vi.fn(),
    create: vi.fn(),
  };
  return { repository, service: new ResearchPlatformBootstrapService(repository as never) };
};

describe('PLATFORM_SEED', () => {
  it('has ~36 platforms with unique valid slugs, valid domains and a usable shape', () => {
    expect(PLATFORM_SEED.length).toBe(36);
    const slugs = PLATFORM_SEED.map((seed) => seed.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const seed of PLATFORM_SEED) {
      expect(seed.slug).toMatch(PLATFORM_SLUG_PATTERN);
      expect(seed.domains.length).toBeGreaterThan(0);
      for (const domain of seed.domains) {
        expect(isPlatformDomain(domain)).toBe(true);
      }
      expect(platformShapeError(seed)).toBeNull();
    }
  });

  it('seeds one official API per PlatformApiKind, every one free and keyless', () => {
    const apis = PLATFORM_SEED.filter(
      (seed) => seed.accessMethod === PlatformAccessMethod.OFFICIAL_API,
    );
    expect(apis.map((seed) => seed.apiKind).sort()).toEqual(Object.values(PlatformApiKind).sort());
  });

  it('puts the platforms in the right category', () => {
    const categoryOf = new Map(PLATFORM_SEED.map((seed) => [seed.slug, seed.category]));
    const expected: Array<[string, PlatformCategory]> = [
      ['openalex', PlatformCategory.ACADEMIC],
      ['pubmed', PlatformCategory.ACADEMIC],
      ['arxiv', PlatformCategory.ACADEMIC],
      ['nature', PlatformCategory.ACADEMIC],
      ['stack-overflow', PlatformCategory.TECHNICAL],
      ['github', PlatformCategory.TECHNICAL],
      ['mdn', PlatformCategory.TECHNICAL],
      ['wikipedia', PlatformCategory.REFERENCE],
      ['reddit', PlatformCategory.FORUM],
      ['youtube', PlatformCategory.VIDEO],
      ['tiktok', PlatformCategory.VIDEO],
      ['x-twitter', PlatformCategory.SOCIAL],
      ['reuters', PlatformCategory.NEWS],
      ['al-jazeera', PlatformCategory.NEWS],
      ['who', PlatformCategory.OFFICIAL],
      ['gov-uk', PlatformCategory.OFFICIAL],
      ['amazon', PlatformCategory.COMMERCE],
      ['product-hunt', PlatformCategory.COMMERCE],
    ];
    for (const [slug, category] of expected) {
      expect(categoryOf.get(slug)).toBe(category);
    }
    const reddit = PLATFORM_SEED.find((seed) => seed.slug === 'reddit');
    expect(reddit?.domains).toEqual(['reddit.com']);
    expect(PLATFORM_SEED.find((seed) => seed.slug === 'x-twitter')?.domains).toEqual([
      'x.com',
      'twitter.com',
    ]);
  });
});

describe('ResearchPlatformBootstrapService', () => {
  it('creates every seed row on an empty table', async () => {
    const { repository, service } = build([]);

    await expect(service.seed()).resolves.toBe(PLATFORM_SEED.length);

    const rows = repository.createMissing.mock.calls[0]?.[0] as Array<{ slug: string }>;
    expect(rows.map((row) => row.slug)).toEqual(PLATFORM_SEED.map((seed) => seed.slug));
  });

  it('is idempotent: an existing (possibly admin-edited) slug is never written again', async () => {
    const { repository, service } = build(['reddit', 'openalex']);

    await service.seed();

    const rows = repository.createMissing.mock.calls[0]?.[0] as Array<{ slug: string }>;
    expect(rows.map((row) => row.slug)).not.toContain('reddit');
    expect(rows.map((row) => row.slug)).not.toContain('openalex');
    expect(rows).toHaveLength(PLATFORM_SEED.length - 2);
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('writes nothing when every slug exists', async () => {
    const { repository, service } = build(PLATFORM_SEED.map((seed) => seed.slug));

    await expect(service.seed()).resolves.toBe(0);
    expect(repository.createMissing).not.toHaveBeenCalled();
  });

  it('a seed failure is logged and never blocks boot', async () => {
    const { repository, service } = build([]);
    repository.listSlugs.mockRejectedValueOnce(new Error('db down'));

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
