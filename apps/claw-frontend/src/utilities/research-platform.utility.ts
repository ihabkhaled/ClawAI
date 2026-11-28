import {
  RESEARCH_PLATFORM_BAD_REQUEST_STATUS,
  RESEARCH_PLATFORM_CATEGORIES,
  RESEARCH_PLATFORM_CONFLICT_STATUS,
  RESEARCH_PLATFORM_FIELD_ERROR_KEYS,
  RESEARCH_PLATFORM_INVALID_KEY,
  RESEARCH_PLATFORM_LIST_SEPARATOR,
  RESEARCH_PLATFORM_SAVE_FAILED_KEY,
  RESEARCH_PLATFORM_SLUG_TAKEN_KEY,
} from '@/constants/research-platform.constants';
import { ResearchPlatformAccessMethod } from '@/enums/research-platform-access-method.enum';
import type { ResearchPlatformCategory } from '@/enums/research-platform-category.enum';
import { ResearchPlatformTestOutcome } from '@/enums/research-platform-test-outcome.enum';
import { researchPlatformRequestSchema } from '@/lib/validation/research-platform.schema';
import { ApiClientError } from '@/services/shared/api-client';
import type { TranslateFunction } from '@/types/i18n.types';
import type {
  CreateResearchPlatformRequest,
  ResearchPlatform,
  ResearchPlatformFormState,
  ResearchPlatformGroup,
  ResearchPlatformTestResult,
  ResearchPlatformTestState,
  ResearchPlatformTestView,
  UpdateResearchPlatformRequest,
} from '@/types/research-platform.types';
import { pluralText } from '@/utilities/plural-text.utility';

/** Entries of a domains / languages box: split on commas, spaces or new lines, blanks and repeats dropped. */
export function parseResearchPlatformList(text: string, lowercase: boolean): string[] {
  const entries = text
    .split(RESEARCH_PLATFORM_LIST_SEPARATOR)
    .map((entry) => (lowercase ? entry.trim().toLowerCase() : entry.trim()))
    .filter((entry) => entry.length > 0);
  return [...new Set(entries)];
}

/** A typed number box as a number; an empty box is NaN (not 0), so validation catches it. */
function parseWholeNumber(text: string): number {
  return text.trim().length === 0 ? Number.NaN : Number(text);
}

/** The dialog's fields for an existing platform. */
export function researchPlatformToForm(platform: ResearchPlatform): ResearchPlatformFormState {
  return {
    slug: platform.slug,
    name: platform.name,
    category: platform.category,
    accessMethod: platform.accessMethod,
    apiKind: platform.apiKind,
    domains: platform.domains.join(', '),
    languages: platform.languages.join(', '),
    priority: String(platform.priority),
    maxResults: String(platform.maxResults),
    timeoutMs: String(platform.timeoutMs),
    notes: platform.notes ?? '',
  };
}

/** The request body from the dialog's text. A site-search platform never carries an API kind. */
export function buildResearchPlatformRequest(
  form: ResearchPlatformFormState,
): CreateResearchPlatformRequest {
  const notes = form.notes.trim();
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    category: form.category,
    accessMethod: form.accessMethod,
    apiKind: form.accessMethod === ResearchPlatformAccessMethod.OFFICIAL_API ? form.apiKind : null,
    domains: parseResearchPlatformList(form.domains, true),
    languages: parseResearchPlatformList(form.languages, false),
    priority: parseWholeNumber(form.priority),
    maxResults: parseWholeNumber(form.maxResults),
    timeoutMs: parseWholeNumber(form.timeoutMs),
    notes: notes.length > 0 ? notes : null,
  };
}

/** The PATCH body for an edit: everything but the slug, which is the platform's identity. */
export function toResearchPlatformUpdate(
  request: CreateResearchPlatformRequest,
): UpdateResearchPlatformRequest {
  return {
    name: request.name,
    category: request.category,
    accessMethod: request.accessMethod,
    apiKind: request.apiKind,
    domains: request.domains,
    languages: request.languages,
    priority: request.priority,
    maxResults: request.maxResults,
    timeoutMs: request.timeoutMs,
    notes: request.notes,
  };
}

/** The i18n key of the first problem in a request, or null when it may be sent. */
export function researchPlatformValidationErrorKey(
  request: CreateResearchPlatformRequest,
): string | null {
  const result = researchPlatformRequestSchema.safeParse(request);
  if (result.success) {
    return null;
  }
  const field = String(result.error.issues[0]?.path[0] ?? '');
  return RESEARCH_PLATFORM_FIELD_ERROR_KEYS[field] ?? RESEARCH_PLATFORM_INVALID_KEY;
}

/** A failed save in words: a taken slug, values the server refused, or anything else. Never the server's text. */
export function researchPlatformSaveErrorKey(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === RESEARCH_PLATFORM_CONFLICT_STATUS) {
      return RESEARCH_PLATFORM_SLUG_TAKEN_KEY;
    }
    if (error.status === RESEARCH_PLATFORM_BAD_REQUEST_STATUS) {
      return RESEARCH_PLATFORM_INVALID_KEY;
    }
  }
  return RESEARCH_PLATFORM_SAVE_FAILED_KEY;
}

/**
 * Platforms grouped by category in page order, each group by priority (lower first) then name.
 * `category` null keeps every category; empty groups are left out.
 */
export function groupResearchPlatforms(
  platforms: readonly ResearchPlatform[],
  category: ResearchPlatformCategory | null,
): ResearchPlatformGroup[] {
  return RESEARCH_PLATFORM_CATEGORIES.filter((entry) => category === null || entry === category)
    .map((entry) => ({
      category: entry,
      platforms: platforms
        .filter((platform) => platform.category === entry)
        .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)),
    }))
    .filter((group) => group.platforms.length > 0);
}

/** The filter Select's value as a category, or null for "all" (or anything that is not a category). */
export function parseResearchPlatformCategoryFilter(
  value: string,
): ResearchPlatformCategory | null {
  return RESEARCH_PLATFORM_CATEGORIES.find((entry) => entry === value) ?? null;
}

/** What a finished test call showed. */
export function researchPlatformTestStateOf(
  result: ResearchPlatformTestResult,
): ResearchPlatformTestState {
  return {
    outcome: result.ok ? ResearchPlatformTestOutcome.PASSED : ResearchPlatformTestOutcome.FAILED,
    result,
  };
}

/** A test result as one line in the reader's language: "Works: 5 results in 812 ms". */
export function describeResearchPlatformTest(
  state: ResearchPlatformTestState,
  t: TranslateFunction,
  locale: string,
): ResearchPlatformTestView {
  const { result } = state;
  if (result === null || state.outcome === ResearchPlatformTestOutcome.REQUEST_FAILED) {
    return {
      outcome: ResearchPlatformTestOutcome.REQUEST_FAILED,
      label: t('researchPlatforms.testRequestFailed'),
    };
  }
  const ms = Math.round(result.latencyMs);
  if (state.outcome === ResearchPlatformTestOutcome.PASSED) {
    const results = pluralText(t, locale, 'researchPlatforms.count.results', result.resultCount);
    return { outcome: state.outcome, label: t('researchPlatforms.testPassed', { results, ms }) };
  }
  const code = result.errorCode?.trim() ?? '';
  return {
    outcome: state.outcome,
    label:
      code.length > 0
        ? t('researchPlatforms.testFailed', { code, ms })
        : t('researchPlatforms.testFailedNoCode', { ms }),
  };
}
