import { ModelSelectionMode, SelectedModelSource } from '@/enums';
import type { AdvancedModelSelectionPayload, ModelSelection } from '@/types';

export function buildAdvancedModelSelectionPayload(
  selection: ModelSelection | null,
): AdvancedModelSelectionPayload {
  if (selection === null) {
    return {
      modelSelectionMode: ModelSelectionMode.AUTO,
    };
  }

  return {
    modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
    requestedProvider: selection.provider,
    requestedModel: selection.model,
    requestedDisplayName: selection.displayName,
    selectedModelSource:
      selection.provider === 'local-ollama'
        ? SelectedModelSource.LOCAL
        : SelectedModelSource.CONNECTOR,
  };
}
