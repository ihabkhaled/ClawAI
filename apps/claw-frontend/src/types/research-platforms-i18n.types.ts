import type { PluralForms, RawPluralForms } from '@/types/plugin-qa-fixes-i18n.types';

/** The admin "Research platforms" page (research-platforms-translations.ts). */
export type ResearchPlatformsLocaleTranslation = {
  title: string;
  description: string;
  addButton: string;
  loadFailed: string;
  emptyTitle: string;
  emptyDescription: string;
  filterLabel: string;
  filterAll: string;
  filterEmpty: string;
  anyLanguage: string;
  col: {
    name: string;
    access: string;
    domains: string;
    languages: string;
    priority: string;
    enabled: string;
    actions: string;
  };
  categories: {
    NEWS: string;
    ACADEMIC: string;
    TECHNICAL: string;
    SOCIAL: string;
    VIDEO: string;
    FORUM: string;
    OFFICIAL: string;
    REFERENCE: string;
    COMMERCE: string;
  };
  accessMethods: { SITE_SEARCH: string; OFFICIAL_API: string };
  toggleLabel: string;
  test: string;
  testing: string;
  testPassed: string;
  testFailed: string;
  testFailedNoCode: string;
  testRequestFailed: string;
  edit: string;
  delete: string;
  deleteTitle: string;
  deleteDescription: string;
  updateFailed: string;
  form: {
    createTitle: string;
    editTitle: string;
    description: string;
    slug: string;
    slugHint: string;
    name: string;
    category: string;
    accessMethod: string;
    apiKind: string;
    domains: string;
    domainsHint: string;
    languages: string;
    languagesHint: string;
    priority: string;
    priorityHint: string;
    maxResults: string;
    timeoutMs: string;
    notes: string;
    create: string;
    creating: string;
    save: string;
    saving: string;
  };
  errors: {
    slug: string;
    name: string;
    apiKind: string;
    domains: string;
    languages: string;
    number: string;
    slugTaken: string;
    invalid: string;
    saveFailed: string;
  };
  count: { results: PluralForms };
};

/** The same shape as written per language, before the missing plural forms are filled in. */
export type RawResearchPlatformsLocaleTranslation = Omit<
  ResearchPlatformsLocaleTranslation,
  'count'
> & {
  count: { results: RawPluralForms };
};
