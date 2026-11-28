import { z } from 'zod';

import { RESEARCH_LANGUAGE_CODE_PATTERN } from '../../../common/constants/research-engine.constants';
import { PlatformAccessMethod, PlatformApiKind, PlatformCategory } from '../../../generated/prisma';
import {
  PLATFORM_MAX_DOMAINS,
  PLATFORM_MAX_LANGUAGES,
  PLATFORM_MAX_PRIORITY,
  PLATFORM_MAX_RESULTS_CEILING,
  PLATFORM_MAX_TIMEOUT_MS,
  PLATFORM_MIN_TIMEOUT_MS,
  PLATFORM_NAME_MAX_LENGTH,
  PLATFORM_NOTES_MAX_LENGTH,
  PLATFORM_SLUG_PATTERN,
} from '../constants/platform-admin.constants';
import { isPlatformDomain, platformShapeError } from '../utilities/platform-shape.utility';

/** The editable fields, shared by create (required where marked) and update (all optional). */
export const platformFieldsSchema = z.object({
  name: z.string().trim().min(2).max(PLATFORM_NAME_MAX_LENGTH),
  category: z.nativeEnum(PlatformCategory),
  accessMethod: z.nativeEnum(PlatformAccessMethod),
  apiKind: z.nativeEnum(PlatformApiKind).nullable(),
  domains: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .refine(isPlatformDomain, { message: 'Not a bare domain (e.g. reddit.com)' }),
    )
    .max(PLATFORM_MAX_DOMAINS),
  languages: z.array(z.string().regex(RESEARCH_LANGUAGE_CODE_PATTERN)).max(PLATFORM_MAX_LANGUAGES),
  enabled: z.boolean(),
  priority: z.number().int().min(0).max(PLATFORM_MAX_PRIORITY),
  maxResults: z.number().int().min(1).max(PLATFORM_MAX_RESULTS_CEILING),
  timeoutMs: z.number().int().min(PLATFORM_MIN_TIMEOUT_MS).max(PLATFORM_MAX_TIMEOUT_MS),
  notes: z.string().trim().max(PLATFORM_NOTES_MAX_LENGTH).nullable(),
});

export const createResearchPlatformSchema = platformFieldsSchema
  .partial({
    apiKind: true,
    domains: true,
    languages: true,
    enabled: true,
    priority: true,
    maxResults: true,
    timeoutMs: true,
    notes: true,
  })
  .extend({ slug: z.string().regex(PLATFORM_SLUG_PATTERN) })
  .superRefine((dto, context) => {
    const error = platformShapeError({
      accessMethod: dto.accessMethod,
      apiKind: dto.apiKind ?? null,
      domains: dto.domains ?? [],
    });
    if (error !== null) {
      context.addIssue({ code: 'custom', message: error });
    }
  });

export type CreateResearchPlatformDto = z.infer<typeof createResearchPlatformSchema>;
