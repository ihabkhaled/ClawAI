import { z } from 'zod';

import {
  RESEARCH_PLATFORM_MAX_DOMAINS,
  RESEARCH_PLATFORM_MAX_LANGUAGES,
  RESEARCH_PLATFORM_MAX_PRIORITY,
  RESEARCH_PLATFORM_MAX_RESULTS,
  RESEARCH_PLATFORM_MAX_TIMEOUT_MS,
  RESEARCH_PLATFORM_MIN_TIMEOUT_MS,
  RESEARCH_PLATFORM_NAME_MAX_LENGTH,
  RESEARCH_PLATFORM_NAME_MIN_LENGTH,
  RESEARCH_PLATFORM_NOTES_MAX_LENGTH,
  RESEARCH_PLATFORM_SLUG_PATTERN,
} from '@/constants/research-platform.constants';
import { ResearchPlatformAccessMethod } from '@/enums/research-platform-access-method.enum';
import { ResearchPlatformApiKind } from '@/enums/research-platform-api-kind.enum';
import { ResearchPlatformCategory } from '@/enums/research-platform-category.enum';
import {
  isResearchPlatformDomain,
  isResearchPlatformLanguage,
} from '@/utilities/research-platform-validation.utility';

/**
 * The body the add / edit dialog sends, checked before it leaves the browser. Mirrors the
 * research-service rules: slug pattern, an API kind for OFFICIAL_API, at least one domain for
 * SITE_SEARCH. The server checks again.
 */
export const researchPlatformRequestSchema = z
  .object({
    slug: z.string().regex(RESEARCH_PLATFORM_SLUG_PATTERN),
    name: z
      .string()
      .trim()
      .min(RESEARCH_PLATFORM_NAME_MIN_LENGTH)
      .max(RESEARCH_PLATFORM_NAME_MAX_LENGTH),
    category: z.nativeEnum(ResearchPlatformCategory),
    accessMethod: z.nativeEnum(ResearchPlatformAccessMethod),
    apiKind: z.nativeEnum(ResearchPlatformApiKind).nullable(),
    domains: z
      .array(z.string().refine(isResearchPlatformDomain))
      .max(RESEARCH_PLATFORM_MAX_DOMAINS),
    languages: z
      .array(z.string().refine(isResearchPlatformLanguage))
      .max(RESEARCH_PLATFORM_MAX_LANGUAGES),
    priority: z.number().int().min(0).max(RESEARCH_PLATFORM_MAX_PRIORITY),
    maxResults: z.number().int().min(1).max(RESEARCH_PLATFORM_MAX_RESULTS),
    timeoutMs: z
      .number()
      .int()
      .min(RESEARCH_PLATFORM_MIN_TIMEOUT_MS)
      .max(RESEARCH_PLATFORM_MAX_TIMEOUT_MS),
    notes: z.string().max(RESEARCH_PLATFORM_NOTES_MAX_LENGTH).nullable(),
  })
  .superRefine((value, context) => {
    if (
      value.accessMethod === ResearchPlatformAccessMethod.OFFICIAL_API &&
      value.apiKind === null
    ) {
      context.addIssue({ code: 'custom', path: ['apiKind'], message: 'apiKind' });
    }
    if (
      value.accessMethod === ResearchPlatformAccessMethod.SITE_SEARCH &&
      value.domains.length === 0
    ) {
      context.addIssue({ code: 'custom', path: ['domains'], message: 'domains' });
    }
  });
