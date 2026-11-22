import type { ConnectorModelExposure } from '../enums/connector-model-exposure.enum';
import type { ConnectorModelKind } from '../enums/connector-model-kind.enum';
import type {
  ConnectorModelEventType,
  ModelVisibilityGate,
  ModelVisibilityGateStatus,
} from '../enums/model-visibility.enum';

import type { TranslateFunction } from './i18n.types';
// model-visibility.types.ts
// Only exported types — no logic, no runtime code.

export type ModelVisibilityGateResult = {
  gate: ModelVisibilityGate;
  status: ModelVisibilityGateStatus;
  /** Backend detail in English (provider evidence, e.g. "Google lists only: createDecision"). */
  detail: string;
};

export type ModelVisibilityEvent = {
  type: ConnectorModelEventType;
  beforeKind: ConnectorModelKind | null;
  afterKind: ConnectorModelKind | null;
  beforeExposure: ConnectorModelExposure | null;
  afterExposure: ConnectorModelExposure | null;
  reason: string | null;
  createdAt: string;
};

/** `GET /connectors/model-visibility?provider=&modelKey=` (ADMIN_CONNECTORS_MANAGE). */
export type ModelVisibilityReport = {
  provider: string;
  modelKey: string;
  visibleInPicker: boolean;
  firstFailingGate: ModelVisibilityGate | null;
  model: {
    connectorId: string;
    connectorName: string;
    displayName: string;
    kind: ConnectorModelKind;
    kindReason: string | null;
    exposure: ConnectorModelExposure;
    lifecycle: string;
  } | null;
  gates: ModelVisibilityGateResult[];
  recentEvents: ModelVisibilityEvent[];
};

/** The kind badge of one admin model row. */
export type ModelKindView = {
  labelKey: string;
  badgeClass: string;
  offeredInChat: boolean;
  /** Why it is not offered, as the sync recorded it; null when unknown or offered. */
  reason: string | null;
};

export type UseModelVisibilityResult = {
  report: ModelVisibilityReport | null;
  isLoading: boolean;
  isError: boolean;
  locale: string;
  onOpenChange: (open: boolean) => void;
};

export type ModelVisibilityButtonProps = {
  provider: string;
  modelKey: string;
  t: TranslateFunction;
};

export type ModelVisibilityDialogProps = {
  provider: string;
  modelKey: string;
  onClose: () => void;
  t: TranslateFunction;
};

export type ModelVisibilityGateListProps = {
  gates: ModelVisibilityGateResult[];
  t: TranslateFunction;
};

export type ModelVisibilityHistoryProps = {
  events: ModelVisibilityEvent[];
  locale: string;
  t: TranslateFunction;
};
