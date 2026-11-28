import type { ResearchPlatformAccessMethod } from '@/enums/research-platform-access-method.enum';
import type { ResearchPlatformApiKind } from '@/enums/research-platform-api-kind.enum';
import type { ResearchPlatformCategory } from '@/enums/research-platform-category.enum';
import type { ResearchPlatformTestOutcome } from '@/enums/research-platform-test-outcome.enum';

import type { TranslateFunction } from './i18n.types';

/** One row of `GET /research/platforms` (research-service `ResearchPlatform`). */
export type ResearchPlatform = {
  id: string;
  slug: string;
  name: string;
  category: ResearchPlatformCategory;
  accessMethod: ResearchPlatformAccessMethod;
  /** Required when `accessMethod` is OFFICIAL_API, null for site search. */
  apiKind: ResearchPlatformApiKind | null;
  /** `site:` scope for SITE_SEARCH; also tags search hits with the platform. */
  domains: string[];
  /** Empty means any language. */
  languages: string[];
  enabled: boolean;
  /** Lower runs first. */
  priority: number;
  maxResults: number;
  timeoutMs: number;
  notes: string | null;
};

export type CreateResearchPlatformRequest = {
  slug: string;
  name: string;
  category: ResearchPlatformCategory;
  accessMethod: ResearchPlatformAccessMethod;
  apiKind: ResearchPlatformApiKind | null;
  domains: string[];
  languages: string[];
  priority: number;
  maxResults: number;
  timeoutMs: number;
  notes: string | null;
  enabled?: boolean;
};

/** PATCH body: any subset; the slug is the platform's identity and is never changed. */
export type UpdateResearchPlatformRequest = Partial<Omit<CreateResearchPlatformRequest, 'slug'>>;

export type UpdateResearchPlatformVariables = {
  id: string;
  body: UpdateResearchPlatformRequest;
};

/** `POST /research/platforms/:id/test` — one sample query through the platform. */
export type ResearchPlatformTestResult = {
  ok: boolean;
  resultCount: number;
  latencyMs: number;
  errorCode?: string | null;
};

export type ResearchPlatformTestState = {
  outcome: ResearchPlatformTestOutcome;
  /** Null when the request itself failed. */
  result: ResearchPlatformTestResult | null;
};

/** A test result as one row shows it. */
export type ResearchPlatformTestView = {
  outcome: ResearchPlatformTestOutcome;
  label: string;
};

/** The add / edit dialog's fields, as typed (lists and numbers are text until submit). */
export type ResearchPlatformFormState = {
  slug: string;
  name: string;
  category: ResearchPlatformCategory;
  accessMethod: ResearchPlatformAccessMethod;
  apiKind: ResearchPlatformApiKind | null;
  domains: string;
  languages: string;
  priority: string;
  maxResults: string;
  timeoutMs: string;
  notes: string;
};

export type ResearchPlatformFormFieldSetter = <K extends keyof ResearchPlatformFormState>(
  key: K,
  value: ResearchPlatformFormState[K],
) => void;

export type ResearchPlatformGroup = {
  category: ResearchPlatformCategory;
  platforms: ResearchPlatform[];
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

export type UseResearchPlatformsReturn = {
  platforms: ResearchPlatform[];
  isLoading: boolean;
  isError: boolean;
};

export type UseCreateResearchPlatformReturn = {
  mutateAsync: (body: CreateResearchPlatformRequest) => Promise<ResearchPlatform>;
  isPending: boolean;
};

export type UseUpdateResearchPlatformReturn = {
  mutateAsync: (variables: UpdateResearchPlatformVariables) => Promise<ResearchPlatform>;
  isPending: boolean;
  /** The platform the in-flight update is for, or null. */
  pendingId: string | null;
};

export type UseDeleteResearchPlatformReturn = {
  mutateAsync: (id: string) => Promise<void>;
  isPending: boolean;
};

export type UseTestResearchPlatformReturn = {
  mutateAsync: (id: string) => Promise<ResearchPlatformTestResult>;
};

export type UseResearchPlatformFormStateReturn = {
  isOpen: boolean;
  editing: ResearchPlatform | null;
  form: ResearchPlatformFormState;
  setField: ResearchPlatformFormFieldSetter;
  openCreate: () => void;
  openEdit: (platform: ResearchPlatform) => void;
  close: () => void;
};

export type UseResearchPlatformFormReturn = UseResearchPlatformFormStateReturn & {
  errorKey: string | null;
  isSaving: boolean;
  /** "Add platform" / "Adding…" / "Save" / "Saving…". */
  submitLabelKey: string;
  submit: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export type UseResearchPlatformDeleteReturn = {
  pending: ResearchPlatform | null;
  isDeleting: boolean;
  request: (platform: ResearchPlatform) => void;
  onOpenChange: (open: boolean) => void;
  confirm: () => Promise<void>;
};

export type UseResearchPlatformTestsReturn = {
  states: Readonly<Record<string, ResearchPlatformTestState>>;
  testingIds: ReadonlySet<string>;
  run: (id: string) => Promise<void>;
};

export type UseResearchPlatformFilterReturn = {
  /** Null means every category. */
  category: ResearchPlatformCategory | null;
  filterValue: string;
  onFilterChange: (value: string) => void;
  groups: ResearchPlatformGroup[];
};

export type UseResearchPlatformToggleReturn = {
  pendingId: string | null;
  hasFailed: boolean;
  toggle: (platform: ResearchPlatform, enabled: boolean) => Promise<void>;
};

export type UseResearchPlatformsPageReturn = {
  t: TranslateFunction;
  platforms: ResearchPlatform[];
  isLoading: boolean;
  isError: boolean;
  filter: UseResearchPlatformFilterReturn;
  form: UseResearchPlatformFormReturn;
  deletion: UseResearchPlatformDeleteReturn;
  toggle: UseResearchPlatformToggleReturn;
  testingIds: ReadonlySet<string>;
  testViews: Readonly<Record<string, ResearchPlatformTestView>>;
  runTest: (id: string) => void;
  /** "Delete Reddit?" — built here so the dialog stays pure render. */
  deleteTitle: string;
};

// ─── Components ─────────────────────────────────────────────────────────────

export type ResearchPlatformFilterProps = {
  t: TranslateFunction;
  value: string;
  onChange: (value: string) => void;
};

/** What a group and each of its rows share: the translator and the row actions. */
export type ResearchPlatformRowHandlers = {
  t: TranslateFunction;
  onToggle: (platform: ResearchPlatform, enabled: boolean) => void;
  onTest: (id: string) => void;
  onEdit: (platform: ResearchPlatform) => void;
  onDelete: (platform: ResearchPlatform) => void;
};

export type ResearchPlatformRowProps = ResearchPlatformRowHandlers & {
  platform: ResearchPlatform;
  isToggling: boolean;
  isTesting: boolean;
  testView: ResearchPlatformTestView | null;
};

export type ResearchPlatformGroupProps = ResearchPlatformRowHandlers & {
  group: ResearchPlatformGroup;
  togglingId: string | null;
  testingIds: ReadonlySet<string>;
  testViews: Readonly<Record<string, ResearchPlatformTestView>>;
};

export type ResearchPlatformTestResultProps = {
  slug: string;
  view: ResearchPlatformTestView;
};

export type ResearchPlatformFormDialogProps = {
  t: TranslateFunction;
  controller: UseResearchPlatformFormReturn;
};

export type ResearchPlatformFormFieldsProps = {
  t: TranslateFunction;
  form: ResearchPlatformFormState;
  setField: ResearchPlatformFormFieldSetter;
  /** True while editing: the slug is the platform's identity and stays fixed. */
  isEditing: boolean;
};
