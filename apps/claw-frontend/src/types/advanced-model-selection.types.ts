import type { ModelSelectionMode, SelectedModelSource } from '@/enums';

import type { ModelSelection } from './component.types';

export type AdvancedModelSelectionMode = ModelSelectionMode;

export type AdvancedModelSelectionPayload = {
  modelSelectionMode: ModelSelectionMode;
  requestedProvider?: string;
  requestedModel?: string;
  requestedDisplayName?: string;
  selectedModelSource?: SelectedModelSource;
};

export type AdvancedModuleModelSelection = ModelSelection | null;
