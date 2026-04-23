import { type ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';

export type AdvancedModelSelectionInput = {
  modelSelectionMode?: ModelSelectionMode;
  requestedProvider?: string;
  requestedModel?: string;
  requestedDisplayName?: string;
  selectedModelSource?: 'LOCAL' | 'CONNECTOR';
};

export type AdvancedModelSelectionResolution = {
  modelSelectionMode: ModelSelectionMode;
  requestedProvider: string | null;
  requestedModel: string | null;
  requestedDisplayName: string | null;
  selectedModelSource: 'LOCAL' | 'CONNECTOR' | null;
  actualProvider: 'local-ollama';
  actualModel: string;
};
