import { describe, expect, it, vi } from 'vitest';

import { Permission, UserRole } from '@claw/shared-types';
import { ProviderSelectionMode } from '../../../../common/enums/provider-selection-mode.enum';
import { ResearchErrorCode } from '../../../../common/enums/research-error-code.enum';
import { SearchExecutionMode } from '../../../../common/enums/search-execution-mode.enum';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { BusinessException } from '../../../../common/errors/business.exception';
import {
  PlatformAccessMethod,
  PlatformApiKind,
  PlatformCategory,
  type ResearchPlatform,
} from '../../../../generated/prisma';
import { ResearchPlatformController } from '../../controllers/research-platform.controller';
import { createResearchPlatformSchema } from '../../dto/create-research-platform.dto';
import { testResearchPlatformSchema } from '../../dto/test-research-platform.dto';
import { updateResearchPlatformSchema } from '../../dto/update-research-platform.dto';
import { ResearchPlatformService } from '../research-platform.service';
import type { SearchExecutionResult } from '../../../search/types/search-execution-result.types';

export const platformRow = (overrides: Partial<ResearchPlatform> = {}): ResearchPlatform => ({
  id: 'pl-1',
  slug: 'reddit',
  name: 'Reddit',
  category: PlatformCategory.FORUM,
  accessMethod: PlatformAccessMethod.SITE_SEARCH,
  apiKind: null,
  domains: ['reddit.com'],
  languages: [],
  enabled: true,
  priority: 10,
  maxResults: 5,
  timeoutMs: 8000,
  notes: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
});

const answer = (urls: string[]): SearchExecutionResult => ({
  runId: 'r',
  providerId: 'p',
  providerName: 'Ollama Web',
  providerKind: SearchProviderKind.OLLAMA_WEB,
  selectionMode: ProviderSelectionMode.AUTO,
  mode: SearchExecutionMode.AUTO_ALL,
  providers: [],
  fallbackUsed: false,
  attemptedProviders: ['Ollama Web'],
  searchRequestCount: 1,
  query: 'q',
  results: urls.map((url) => ({
    id: url,
    title: url,
    url,
    snippet: null,
    publishedAt: null,
    freshness: null,
    score: 1,
    providerKind: SearchProviderKind.OLLAMA_WEB,
  })),
  latencyMs: 3,
});

const build = (row: ResearchPlatform | null = platformRow()) => {
  const repository = {
    list: vi.fn(async () => (row === null ? [] : [row])),
    findById: vi.fn(async () => row),
    findBySlug: vi.fn(async (): Promise<ResearchPlatform | null> => null),
    create: vi.fn(async (data: object) => ({ ...platformRow(), ...data })),
    update: vi.fn(async (_id: string, data: object) => ({ ...platformRow(), ...data })),
    delete: vi.fn(async () => row),
  };
  const platformSearch = {
    callOne: vi.fn(async () => ({
      slug: 'openalex',
      name: 'OpenAlex',
      category: PlatformCategory.ACADEMIC,
      language: 'en',
      ok: true,
      results: [{}, {}, {}],
      latencyMs: 120,
      errorCode: null,
    })),
  };
  const search = {
    executeExpansion: vi.fn(async () =>
      answer(['https://www.reddit.com/r/x', 'https://other.example/y']),
    ),
  };
  const service = new ResearchPlatformService(
    repository as never,
    platformSearch as never,
    search as never,
  );
  return { repository, platformSearch, search, service };
};

describe('ResearchPlatformService — CRUD', () => {
  it('lists, reads, creates, updates and deletes through the repository', async () => {
    const { repository, service } = build();

    await expect(service.list()).resolves.toHaveLength(1);
    await expect(service.getById('pl-1')).resolves.toMatchObject({ slug: 'reddit' });
    await service.create({
      slug: 'lobsters',
      name: 'Lobsters',
      category: PlatformCategory.FORUM,
      accessMethod: PlatformAccessMethod.SITE_SEARCH,
      domains: ['lobste.rs'],
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'lobsters', apiKind: null }),
    );
    await service.update('pl-1', { priority: 5, enabled: false });
    expect(repository.update).toHaveBeenCalledWith('pl-1', { priority: 5, enabled: false });
    await service.delete('pl-1');
    expect(repository.delete).toHaveBeenCalledWith('pl-1');
  });

  it('a taken slug is a 409, an unknown id a 404', async () => {
    const { repository, service } = build(null);
    repository.findBySlug.mockResolvedValueOnce(platformRow());

    await expect(
      service.create({
        slug: 'reddit',
        name: 'Reddit',
        category: PlatformCategory.FORUM,
        accessMethod: PlatformAccessMethod.SITE_SEARCH,
        domains: ['reddit.com'],
      }),
    ).rejects.toMatchObject({ code: ResearchErrorCode.NAME_TAKEN });
    await expect(service.getById('nope')).rejects.toMatchObject({
      code: 'RESEARCHPLATFORM_NOT_FOUND',
    });
    await expect(service.delete('nope')).rejects.toBeInstanceOf(BusinessException);
  });

  it('an update that would break the row shape is refused (merged with the stored row)', async () => {
    const { repository, service } = build();

    await expect(service.update('pl-1', { domains: [] })).rejects.toMatchObject({
      code: ResearchErrorCode.CONFIG_INVALID,
    });
    await expect(
      service.update('pl-1', { accessMethod: PlatformAccessMethod.OFFICIAL_API }),
    ).rejects.toMatchObject({
      code: ResearchErrorCode.CONFIG_INVALID,
    });
    await service.update('pl-1', {
      accessMethod: PlatformAccessMethod.OFFICIAL_API,
      apiKind: PlatformApiKind.OPENALEX,
    });
    expect(repository.update).toHaveBeenCalledTimes(1);
  });
});

describe('ResearchPlatformService — test endpoint', () => {
  it('an API platform runs its API once with no unit, and reports count, latency and code', async () => {
    const { platformSearch, service } = build(
      platformRow({
        slug: 'openalex',
        accessMethod: PlatformAccessMethod.OFFICIAL_API,
        apiKind: PlatformApiKind.OPENALEX,
      }),
    );

    await expect(service.test('pl-1', { query: 'deep nets' }, 'admin-1')).resolves.toEqual({
      slug: 'openalex',
      ok: true,
      resultCount: 3,
      latencyMs: 120,
      errorCode: null,
    });
    expect(platformSearch.callOne).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'openalex' }),
      { query: 'deep nets', maxResults: 5, language: 'en' },
    );
    expect(platformSearch.callOne.mock.calls[0]).toHaveLength(2);
  });

  it('a site platform searches site:<domain> on expansion providers and counts on-domain hits only', async () => {
    const { search, service } = build();

    const result = await service.test('pl-1', {}, 'admin-1');

    expect(search.executeExpansion).toHaveBeenCalledWith(
      'admin-1',
      { query: 'site:reddit.com machine learning', maxResults: 5 },
      false,
    );
    expect(result).toMatchObject({ slug: 'reddit', ok: true, resultCount: 1, errorCode: null });
  });

  it('no expansion provider or a failed search is reported as a code, never thrown', async () => {
    const { search, service } = build();
    search.executeExpansion.mockResolvedValueOnce(null as never);
    await expect(service.test('pl-1', {}, 'a')).resolves.toMatchObject({
      ok: false,
      resultCount: 0,
      errorCode: ResearchErrorCode.NO_ENABLED_PROVIDER,
    });

    search.executeExpansion.mockRejectedValueOnce(
      new BusinessException('research.search.execution_failed', ResearchErrorCode.SEARCH_FAILED),
    );
    await expect(service.test('pl-1', {}, 'a')).resolves.toMatchObject({
      ok: false,
      errorCode: 'SEARCH_FAILED',
    });
  });
});

describe('ResearchPlatformController', () => {
  it('every method is one service call', async () => {
    const service = {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => platformRow()),
      create: vi.fn(async () => platformRow()),
      update: vi.fn(async () => platformRow()),
      delete: vi.fn(async () => {}),
      test: vi.fn(async () => ({
        slug: 'reddit',
        ok: true,
        resultCount: 1,
        latencyMs: 1,
        errorCode: null,
      })),
    };
    const controller = new ResearchPlatformController(service as never);
    const dto = {
      slug: 'x-y',
      name: 'XY',
      category: PlatformCategory.NEWS,
      accessMethod: PlatformAccessMethod.SITE_SEARCH,
      domains: ['xy.example'],
    };

    await controller.list();
    await controller.getOne('pl-1');
    await controller.create(dto);
    await controller.update('pl-1', { enabled: false });
    await controller.remove('pl-1');
    await controller.test('pl-1', { query: 'abc' }, { id: 'admin-1', email: 'a@x', role: 'ADMIN' });

    expect(service.getById).toHaveBeenCalledWith('pl-1');
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(service.update).toHaveBeenCalledWith('pl-1', { enabled: false });
    expect(service.delete).toHaveBeenCalledWith('pl-1');
    expect(service.test).toHaveBeenCalledWith('pl-1', { query: 'abc' }, 'admin-1');
  });

  it('is admin-only with RESEARCH_PROVIDERS_MANAGE on the whole controller', () => {
    expect(Reflect.getMetadata('roles', ResearchPlatformController)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata('claw:require-permissions', ResearchPlatformController)).toEqual([
      Permission.RESEARCH_PROVIDERS_MANAGE,
    ]);
  });
});

describe('platform admin DTOs', () => {
  const valid = {
    slug: 'lobsters',
    name: 'Lobsters',
    category: PlatformCategory.FORUM,
    accessMethod: PlatformAccessMethod.SITE_SEARCH,
    domains: ['Lobste.rs'],
  };

  it('accepts a site platform (domains lower-cased) and an API platform', () => {
    expect(createResearchPlatformSchema.parse(valid).domains).toEqual(['lobste.rs']);
    expect(
      createResearchPlatformSchema.safeParse({
        ...valid,
        slug: 'oa-2',
        accessMethod: PlatformAccessMethod.OFFICIAL_API,
        apiKind: PlatformApiKind.OPENALEX,
        domains: [],
      }).success,
    ).toBe(true);
  });

  it.each([
    ['bad slug', { slug: 'Bad Slug' }],
    ['one-char slug', { slug: 'a' }],
    ['scheme in a domain', { domains: ['https://reddit.com'] }],
    ['path in a domain', { domains: ['reddit.com/r/x'] }],
    ['space in a domain', { domains: ['reddit.com OR evil'] }],
    ['hyphen-edged label', { domains: ['-reddit.com'] }],
    ['numeric tld', { domains: ['10.0.0.1'] }],
    ['site search without domain', { domains: [] }],
    ['site search with apiKind', { apiKind: PlatformApiKind.GITHUB }],
    ['api without apiKind', { accessMethod: PlatformAccessMethod.OFFICIAL_API }],
    ['unknown category', { category: 'GOSSIP' }],
    ['timeout too short', { timeoutMs: 10 }],
    ['too many results', { maxResults: 99 }],
    ['bad language', { languages: ['english'] }],
  ])('rejects %s', (_name, patch) => {
    expect(createResearchPlatformSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it('update is a strict partial (the slug never changes); test query is optional and bounded', () => {
    expect(updateResearchPlatformSchema.safeParse({ enabled: false }).success).toBe(true);
    expect(updateResearchPlatformSchema.safeParse({ slug: 'new' }).success).toBe(false);
    expect(testResearchPlatformSchema.parse(undefined)).toEqual({});
    expect(testResearchPlatformSchema.safeParse({ query: 'x'.repeat(201) }).success).toBe(false);
  });
});
