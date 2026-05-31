// Reads + writes the user's persisted Models-page view mode. The
// `useAllModels` hook holds the React state; this utility encapsulates the
// SSR-safe localStorage access (and the schema validation that protects
// the hook from a manually-edited value).
import { ModelCatalogViewMode } from '@/enums';

import { logger } from './logger.utility';

const STORAGE_KEY = 'models:viewMode';

export function readPersistedModelViewMode(): ModelCatalogViewMode {
  if (typeof window === 'undefined') {
    return ModelCatalogViewMode.TABLE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === ModelCatalogViewMode.GRID || raw === ModelCatalogViewMode.TABLE) {
      return raw;
    }
  } catch (error) {
    logger.warn({
      component: 'models',
      action: 'view-mode-storage-read',
      message: 'localStorage read failed; falling back to TABLE',
      details: { error: (error as Error).message },
    });
  }
  return ModelCatalogViewMode.TABLE;
}

export function writePersistedModelViewMode(mode: ModelCatalogViewMode): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    logger.warn({
      component: 'models',
      action: 'view-mode-storage-write',
      message: 'localStorage write failed; mode change will not persist across reloads',
      details: { error: (error as Error).message },
    });
  }
}
