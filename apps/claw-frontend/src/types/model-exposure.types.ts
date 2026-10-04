import type { CheckedState } from '@radix-ui/react-checkbox';

import type { ConnectorModelExposure } from '../enums/connector-model-exposure.enum';
import type { ConnectorModelKind } from '../enums/connector-model-kind.enum';

import type { TranslateFunction } from './i18n.types';
import type { ModelBillingInfo } from './model-billing.types';
// model-exposure.types.ts
// Only exported types — no logic, no runtime code.

/**
 * exposure is the admin decision about what ClawAI offers, distinct from
 * lifecycle which is what the provider says about the model.
 */
export interface ConnectorModelRow {
  /** A custom provider's own name; absent for built-in providers. */
  providerDisplayName?: string;
  id: string;
  connectorId: string;
  provider: string;
  modelKey: string;
  displayName: string;
  // Connector lifecycle, not the public catalogue's ModelLifecycle enum. Kept as
  // a plain string because it is display-only here and the two vocabularies must
  // not be confused.
  lifecycle: string;
  exposure: ConnectorModelExposure;
  kind: ConnectorModelKind;
  // Int? and DateTime? in Prisma — a model whose provider never reported a
  // context window, or that has not been seen since the column was added, has
  // no value here rather than a zero.
  maxContextTokens: number | null;
  usageTier: string;
  syncedAt: string;
  lastSeenAt: string | null;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
}

export interface SetModelExposureRequest {
  modelKeys: string[];
  exposed: boolean;
}

export interface SetModelExposureResponse {
  updated: number;
  previouslyExposed: string[];
}

export interface ModelExposureFilters {
  search: string;
  provider: string | null;
  exposedOnly: boolean | null;
  kind: ConnectorModelKind | null;
}

// Declaration ownership: hooks live in src/hooks, their shapes live here.
export interface UseModelExposureResult {
  rows: ConnectorModelRow[];
  visibleRows: ConnectorModelRow[];
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  filters: ModelExposureFilters;
  setFilter: <K extends keyof ModelExposureFilters>(key: K, value: ModelExposureFilters[K]) => void;
  selected: Set<string>;
  toggle: (modelKey: string) => void;
  selectAllVisible: () => void;
  clearSelection: () => void;
  exposedCount: number;
  unexposedCount: number;
  // For an unexpose, the keys currently EXPOSED among the selection, so the
  // screen can state what is about to be taken away BEFORE the operator
  // confirms rather than after.
  impact: string[];
  load: () => Promise<void>;
  apply: (exposed: boolean) => Promise<void>;
  // One row's action menu: applies to exactly these keys.
  applyTo: (modelKeys: string[], exposed: boolean) => Promise<void>;
  resetFilters: () => void;
}

/** One shown row with everything its cell or card renders. */
export type ModelExposureRowView = {
  row: ConnectorModelRow;
  isSelected: boolean;
  isExposed: boolean;
  providerLabel: string;
  billing: ModelBillingInfo;
  // Locale-formatted; null renders "Never seen".
  lastSeenLabel: string | null;
  // null when the lifecycle is a value this build does not know: shown raw.
  lifecycleLabelKey: string | null;
  lifecycleBadgeClass: string;
};

export type UseModelExposureUnexposeConfirmResult = {
  pending: ConnectorModelRow | null;
  request: (row: ConnectorModelRow) => void;
  confirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export type UseModelExposurePanelResult = {
  t: TranslateFunction;
  items: ModelExposureRowView[];
  rowCount: number;
  filteredCount: number;
  hasMore: boolean;
  onShowMore: () => void;
  filters: ModelExposureFilters;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onExposureFilterChange: (value: string) => void;
  onResetFilters: () => void;
  selectedCount: number;
  selectAllState: CheckedState;
  onToggleSelectAll: () => void;
  onToggleRow: (modelKey: string) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  exposedCount: number;
  unexposedCount: number;
  impact: string[];
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  isPolicyError: boolean;
  onApply: (exposed: boolean) => void;
  onExposeRow: (row: ConnectorModelRow) => void;
  unexposeConfirm: UseModelExposureUnexposeConfirmResult;
};

export type ModelExposureSectionProps = {
  connectorId: string;
  // The /connectors/[id]/models route already renders a PageHeader with the
  // same title and description; it passes false so they are not shown twice.
  showHeader?: boolean;
};

export type ModelExposureToolbarProps = {
  filters: ModelExposureFilters;
  exposedCount: number;
  unexposedCount: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onExposureFilterChange: (value: string) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  t: TranslateFunction;
};

export type ModelExposureFilterSelectProps = {
  exposedOnly: boolean | null;
  onChange: (value: string) => void;
  triggerClassName?: string;
  t: TranslateFunction;
};

export type ModelExposureFilterSheetProps = {
  exposedOnly: boolean | null;
  hasActiveFilters: boolean;
  onExposureFilterChange: (value: string) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  t: TranslateFunction;
};

export type ModelExposureBulkBarProps = {
  selectedCount: number;
  impact: string[];
  isSaving: boolean;
  onApply: (exposed: boolean) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  t: TranslateFunction;
};

export type ModelExposureRowActionsProps = {
  view: ModelExposureRowView;
  isSaving: boolean;
  onExpose: (row: ConnectorModelRow) => void;
  onRequestUnexpose: (row: ConnectorModelRow) => void;
  t: TranslateFunction;
};

export type ModelExposureListProps = {
  items: ModelExposureRowView[];
  isSaving: boolean;
  selectAllState: CheckedState;
  onToggleSelectAll: () => void;
  onToggleRow: (modelKey: string) => void;
  onExpose: (row: ConnectorModelRow) => void;
  onRequestUnexpose: (row: ConnectorModelRow) => void;
  t: TranslateFunction;
};

export type ModelExposureCardProps = {
  view: ModelExposureRowView;
  isSaving: boolean;
  onToggleRow: (modelKey: string) => void;
  onExpose: (row: ConnectorModelRow) => void;
  onRequestUnexpose: (row: ConnectorModelRow) => void;
  t: TranslateFunction;
};

export type ModelExposureChipProps = {
  view: ModelExposureRowView;
  t: TranslateFunction;
};

export type ModelExposureEmptyProps = {
  rowCount: number;
  onResetFilters: () => void;
  t: TranslateFunction;
};

export type ModelExposureLoadingProps = {
  label: string;
};
