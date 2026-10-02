import { STATUS_STYLES } from '@/constants/status-badge.constants';
import { ConnectorModelExposure } from '@/enums/connector-model-exposure.enum';
import { ConnectorModelLifecycle } from '@/enums/connector-model-lifecycle.enum';
import { ModelExposureFilterOption } from '@/enums/model-exposure-filter.enum';
import type { ModelExposureFilters } from '@/types/model-exposure.types';

// Mirrors `setModelExposureSchema`'s `modelKeys` cap in
// apps/claw-connector-service/src/modules/connectors/dto/set-model-exposure.dto.ts
// (`z.array(...).max(200)`), bounded on purpose so one request cannot rewrite
// an entire catalog unaudited. "Select all shown" can legitimately exceed
// this (a connector can carry hundreds of models), so a bulk apply chunks
// into batches of this size instead of sending one oversized request that
// failed Zod validation with a generic "Validation failed" and no way for
// the operator to tell why (2026-09-24).
export const MODEL_EXPOSURE_BATCH_SIZE = 200;

export const EMPTY_MODEL_EXPOSURE_FILTERS: Readonly<ModelExposureFilters> = Object.freeze({
  search: '',
  provider: null,
  exposedOnly: null,
  kind: null,
});

// Rows rendered per "Show more" step: 449 rows at once made the page unusable
// on a phone and left the bulk actions thousands of pixels away.
export const MODEL_EXPOSURE_PAGE_SIZE = 50;

export const MODEL_EXPOSURE_FILTER_OPTIONS: ReadonlyArray<ModelExposureFilterOption> = [
  ModelExposureFilterOption.ALL,
  ModelExposureFilterOption.EXPOSED,
  ModelExposureFilterOption.UNEXPOSED,
];

export const MODEL_EXPOSURE_FILTER_LABEL_KEYS: Record<ModelExposureFilterOption, string> = {
  [ModelExposureFilterOption.ALL]: 'adminConnectors.exposure.filterAll',
  [ModelExposureFilterOption.EXPOSED]: 'adminConnectors.exposure.filterExposed',
  [ModelExposureFilterOption.UNEXPOSED]: 'adminConnectors.exposure.filterUnexposed',
};

export const MODEL_EXPOSURE_LABEL_KEYS: Record<ConnectorModelExposure, string> = {
  [ConnectorModelExposure.EXPOSED]: 'adminConnectors.exposure.exposed',
  [ConnectorModelExposure.UNEXPOSED]: 'adminConnectors.exposure.unexposed',
};

// The audited StatusBadge palette (WCAG AA in both themes), not ad-hoc tints.
export const MODEL_EXPOSURE_BADGE_CLASSES: Record<ConnectorModelExposure, string> = {
  [ConnectorModelExposure.EXPOSED]: STATUS_STYLES['active'] ?? '',
  [ConnectorModelExposure.UNEXPOSED]: STATUS_STYLES['inactive'] ?? '',
};

export const CONNECTOR_MODEL_LIFECYCLE_LABEL_KEYS: Record<ConnectorModelLifecycle, string> = {
  [ConnectorModelLifecycle.ACTIVE]: 'adminConnectors.exposureUi.lifecycleActive',
  [ConnectorModelLifecycle.DEPRECATED]: 'adminConnectors.exposureUi.lifecycleDeprecated',
  [ConnectorModelLifecycle.SUNSET]: 'adminConnectors.exposureUi.lifecycleSunset',
  [ConnectorModelLifecycle.REMOVED]: 'adminConnectors.exposureUi.lifecycleRemoved',
};

export const CONNECTOR_MODEL_LIFECYCLE_BADGE_CLASSES: Record<ConnectorModelLifecycle, string> = {
  [ConnectorModelLifecycle.ACTIVE]: STATUS_STYLES['active'] ?? '',
  [ConnectorModelLifecycle.DEPRECATED]: STATUS_STYLES['pending'] ?? '',
  [ConnectorModelLifecycle.SUNSET]: STATUS_STYLES['pending'] ?? '',
  [ConnectorModelLifecycle.REMOVED]: STATUS_STYLES['error'] ?? '',
};

// Placeholder rows while the model list loads.
export const MODEL_EXPOSURE_SKELETON_ROWS: ReadonlyArray<number> = [0, 1, 2, 3, 4, 5];
