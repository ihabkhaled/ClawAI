import {
  PLATFORM_DEFAULT_WIKIPEDIA_LANGUAGE,
  PLATFORM_MAX_API_PER_RUN,
  PLATFORM_MAX_SITE_PER_RUN,
  PLATFORM_MAX_WIKIPEDIA_LANGUAGES,
  PLATFORM_MIN_DEPTH,
} from '../../../common/constants/research-engine.constants';
import {
  PlatformAccessMethod,
  PlatformApiKind,
  type PlatformCategory,
  type ResearchPlatform,
} from '../../../generated/prisma';
import { platformForUrl } from '../../platforms/utilities/platform-matching.utility';
import type { ExecuteResearchDto } from '../dto/execute-research.dto';
import type { EvidenceItem } from '../types/evidence-bundle.types';
import type {
  FusedSearchResult,
  PlatformRunPlan,
  QueryBudgetSplit,
} from '../types/research-engine.types';

/**
 * A platform run (research engine B3) needs BOTH depth >= 2 and at least one
 * requested category. Anything else is exactly the B2 run: no registry read.
 */
export function isPlatformRun(dto: ExecuteResearchDto, depth: number | null): boolean {
  return depth !== null && depth >= PLATFORM_MIN_DEPTH && (dto.platforms?.length ?? 0) > 0;
}

/** A row serves the run when it names no language, the run names none, or they share one. */
export function servesLanguages(
  platform: Pick<ResearchPlatform, 'languages'>,
  languages: readonly string[],
): boolean {
  return (
    platform.languages.length === 0 ||
    languages.length === 0 ||
    platform.languages.some((language) => languages.includes(language))
  );
}

/**
 * Picks this run's platforms from the enabled registry: the asked categories,
 * priority order, at most `PLATFORM_MAX_API_PER_RUN` official APIs and
 * `PLATFORM_MAX_SITE_PER_RUN` site searches. With an explicit search provider
 * the user chose one source, so no official API runs (rule 41 item 9).
 */
export function planPlatformRun(
  enabled: readonly ResearchPlatform[],
  categories: readonly PlatformCategory[],
  languages: readonly string[],
  explicitProvider: boolean,
): PlatformRunPlan {
  const wanted = new Set(categories);
  const all = [...enabled]
    .filter((platform) => platform.enabled)
    .sort((left, right) => left.priority - right.priority || left.slug.localeCompare(right.slug));
  const eligible = all.filter(
    (platform) => wanted.has(platform.category) && servesLanguages(platform, languages),
  );
  const api = explicitProvider
    ? []
    : eligible
        .filter(
          (platform) =>
            platform.accessMethod === PlatformAccessMethod.OFFICIAL_API &&
            platform.apiKind !== null,
        )
        .slice(0, PLATFORM_MAX_API_PER_RUN);
  const site = eligible
    .filter(
      (platform) =>
        platform.accessMethod === PlatformAccessMethod.SITE_SEARCH && platform.domains.length > 0,
    )
    .slice(0, PLATFORM_MAX_SITE_PER_RUN);
  const wikipedia = api.find((platform) => platform.apiKind === PlatformApiKind.WIKIPEDIA);
  return {
    all,
    api,
    site,
    wikipediaLanguages: wikipedia === undefined ? [] : wikipediaLanguagesFor(wikipedia, languages),
    queryLanguage: languages.length === 1 ? (languages[0] ?? null) : null,
  };
}

/** The editions to search: the requested languages (else English), the row's own list if any, max 3. */
export function wikipediaLanguagesFor(
  platform: Pick<ResearchPlatform, 'languages'>,
  languages: readonly string[],
): string[] {
  const requested = languages.length > 0 ? languages : [PLATFORM_DEFAULT_WIKIPEDIA_LANGUAGE];
  return [...new Set(requested)]
    .filter((language) => platform.languages.length === 0 || platform.languages.includes(language))
    .slice(0, PLATFORM_MAX_WIKIPEDIA_LANGUAGES);
}

/**
 * Splits the extra-query budget (depth budget − primary) between expansion
 * queries and site searches: site searches get at most half (rounded up),
 * more when the expansions leave it unused; expansions keep the rest.
 */
export function splitQueryBudget(
  cap: number,
  expansionsWanted: number,
  siteWanted: number,
): QueryBudgetSplit {
  const budget = Math.max(0, cap);
  const siteShare = Math.ceil(budget / 2);
  const site = Math.min(
    PLATFORM_MAX_SITE_PER_RUN,
    siteWanted,
    Math.max(siteShare, budget - expansionsWanted),
  );
  return { site, expansions: Math.min(expansionsWanted, budget - site) };
}

/** Tags a fused hit with the first platform whose domain its host matches (an explicit tag wins). */
export function tagResultByHost(
  result: FusedSearchResult,
  platforms: readonly ResearchPlatform[],
): FusedSearchResult {
  if (result.platform !== undefined) {
    return result;
  }
  const match = platformForUrl(result.url, platforms);
  return match === null
    ? result
    : { ...result, platform: match.slug, platformCategory: match.category };
}

/** Same rule for a finished evidence item (pages, pasted links, thread extras). Mutates. */
export function tagItemByHost(item: EvidenceItem, platforms: readonly ResearchPlatform[]): void {
  if (item.platform !== undefined) {
    return;
  }
  const match = platformForUrl(item.url, platforms);
  if (match !== null) {
    item.platform = match.slug;
    item.platformCategory = match.category;
  }
}
