import { HttpStatus, Injectable } from '@nestjs/common';

import { PLATFORM_DEFAULT_WIKIPEDIA_LANGUAGE } from '../../../common/constants/research-engine.constants';
import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { PlatformAccessMethod, type ResearchPlatform } from '../../../generated/prisma';
import { SearchExecutionService } from '../../search/services/search-execution.service';
import { classifySearchError } from '../../search/utilities/classify-search-error.utility';
import { PLATFORM_TEST_DEFAULT_QUERY } from '../constants/platform-api.constants';
import { ResearchPlatformRepository } from '../repositories/research-platform.repository';
import { siteQueryOf, urlMatchesPlatform } from '../utilities/platform-matching.utility';
import { platformShapeError } from '../utilities/platform-shape.utility';
import { PlatformSearchService } from './platform-search.service';
import type { CreateResearchPlatformDto } from '../dto/create-research-platform.dto';
import type { TestResearchPlatformDto } from '../dto/test-research-platform.dto';
import type { UpdateResearchPlatformDto } from '../dto/update-research-platform.dto';
import type { PlatformTestResult } from '../types/platform.types';

/** Admin CRUD and the test call for the platform registry (research engine B3). */
@Injectable()
export class ResearchPlatformService {
  constructor(
    private readonly repository: ResearchPlatformRepository,
    private readonly platformSearch: PlatformSearchService,
    private readonly searchService: SearchExecutionService,
  ) {}

  list(): Promise<ResearchPlatform[]> {
    return this.repository.list();
  }

  getById(id: string): Promise<ResearchPlatform> {
    return this.loadOrThrow(id);
  }

  async create(dto: CreateResearchPlatformDto): Promise<ResearchPlatform> {
    if ((await this.repository.findBySlug(dto.slug)) !== null) {
      throw new BusinessException(
        'research.platform.slug_taken',
        ResearchErrorCode.NAME_TAKEN,
        HttpStatus.CONFLICT,
        { slug: dto.slug },
      );
    }
    return this.repository.create({ ...dto, apiKind: dto.apiKind ?? null });
  }

  /** The stored row merged with the patch must still be a usable platform. */
  async update(id: string, dto: UpdateResearchPlatformDto): Promise<ResearchPlatform> {
    const existing = await this.loadOrThrow(id);
    const error = platformShapeError({
      accessMethod: dto.accessMethod ?? existing.accessMethod,
      apiKind: dto.apiKind === undefined ? existing.apiKind : dto.apiKind,
      domains: dto.domains ?? existing.domains,
    });
    if (error !== null) {
      throw new BusinessException(
        'research.platform.invalid_shape',
        ResearchErrorCode.CONFIG_INVALID,
        HttpStatus.BAD_REQUEST,
        { message: error },
      );
    }
    return this.repository.update(id, dto);
  }

  async delete(id: string): Promise<void> {
    await this.loadOrThrow(id);
    await this.repository.delete(id);
  }

  /**
   * Runs one sample query on the platform (enabled or not) and reports what
   * came back. An API platform calls its API (no unit recorded, like a
   * provider health check); a site platform runs `site:<domain> <query>` on
   * the expansion providers and counts only hits on its own domains.
   */
  async test(
    id: string,
    dto: TestResearchPlatformDto,
    userId: string,
  ): Promise<PlatformTestResult> {
    const platform = await this.loadOrThrow(id);
    const query = dto.query ?? PLATFORM_TEST_DEFAULT_QUERY;
    return platform.accessMethod === PlatformAccessMethod.OFFICIAL_API
      ? this.testApi(platform, query)
      : this.testSiteSearch(platform, query, userId);
  }

  private async testApi(platform: ResearchPlatform, query: string): Promise<PlatformTestResult> {
    const outcome = await this.platformSearch.callOne(platform, {
      query,
      maxResults: platform.maxResults,
      language: platform.languages[0] ?? PLATFORM_DEFAULT_WIKIPEDIA_LANGUAGE,
    });
    return {
      slug: platform.slug,
      ok: outcome.ok,
      resultCount: outcome.results.length,
      latencyMs: outcome.latencyMs,
      errorCode: outcome.errorCode,
    };
  }

  private async testSiteSearch(
    platform: ResearchPlatform,
    query: string,
    userId: string,
  ): Promise<PlatformTestResult> {
    const started = Date.now();
    try {
      const answer = await this.searchService.executeExpansion(
        userId,
        { query: siteQueryOf(platform, query), maxResults: platform.maxResults },
        false,
      );
      const count =
        answer?.results.filter((result) => urlMatchesPlatform(result.url, platform)).length ?? 0;
      return {
        slug: platform.slug,
        ok: answer !== null,
        resultCount: count,
        latencyMs: Date.now() - started,
        errorCode: answer === null ? ResearchErrorCode.NO_ENABLED_PROVIDER : null,
      };
    } catch (error) {
      const code =
        error instanceof BusinessException ? error.code : classifySearchError(error).code;
      return {
        slug: platform.slug,
        ok: false,
        resultCount: 0,
        latencyMs: Date.now() - started,
        errorCode: code,
      };
    }
  }

  private async loadOrThrow(id: string): Promise<ResearchPlatform> {
    const platform = await this.repository.findById(id);
    if (platform === null) {
      throw new EntityNotFoundException('ResearchPlatform', id);
    }
    return platform;
  }
}
