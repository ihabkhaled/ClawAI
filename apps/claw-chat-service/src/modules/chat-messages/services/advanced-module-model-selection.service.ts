import { Injectable } from '@nestjs/common';

import { BusinessException } from '../../../common/errors';
import { ModelSelectionMode } from '../../../common/enums/model-selection-mode.enum';
import type {
  AdvancedModelSelectionInput,
  AdvancedModelSelectionResolution,
} from '../types/advanced-model-selection.types';
import { LocalModelSelectionService } from './local-model-selection.service';

@Injectable()
export class AdvancedModuleModelSelectionService {
  constructor(private readonly localModelSelection: LocalModelSelectionService) {}

  async resolveSelection(
    selection: AdvancedModelSelectionInput,
    fallbackModel: string,
  ): Promise<AdvancedModelSelectionResolution> {
    const requestedModel = selection.requestedModel?.trim();
    const requestedProvider = selection.requestedProvider?.trim();
    const requestedDisplayName = selection.requestedDisplayName?.trim();
    const selectedModelSource = selection.selectedModelSource ?? null;

    if (!requestedModel || requestedModel === 'AUTO') {
      return {
        modelSelectionMode: ModelSelectionMode.AUTO,
        requestedProvider: requestedProvider ?? null,
        requestedModel: null,
        requestedDisplayName: requestedDisplayName ?? null,
        selectedModelSource,
        actualProvider: 'local-ollama',
        actualModel: await this.resolveFallbackModel(fallbackModel),
      };
    }

    if (
      requestedProvider &&
      requestedProvider.length > 0 &&
      requestedProvider.toLowerCase() !== 'local-ollama'
    ) {
      throw new BusinessException(
        `Advanced routing labs currently require a locally installed Ollama model. "${requestedProvider}" is not supported for manual execution in this workflow.`,
        'ADVANCED_MODULE_MODEL_PROVIDER_UNSUPPORTED',
      );
    }

    const installedModels = await this.localModelSelection.listInstalledModelNames();
    if (!installedModels.includes(requestedModel)) {
      throw new BusinessException(
        `The selected local model "${requestedModel}" is not installed or is unavailable.`,
        'ADVANCED_MODULE_MODEL_UNAVAILABLE',
      );
    }

    return {
      modelSelectionMode: ModelSelectionMode.MANUAL_MODEL,
      requestedProvider: requestedProvider ?? 'local-ollama',
      requestedModel,
      requestedDisplayName: requestedDisplayName ?? requestedModel,
      selectedModelSource: selectedModelSource ?? 'LOCAL',
      actualProvider: 'local-ollama',
      actualModel: requestedModel,
    };
  }

  private async resolveFallbackModel(fallbackModel: string): Promise<string> {
    if (fallbackModel !== 'AUTO') {
      return fallbackModel;
    }
    return this.localModelSelection.resolveDefaultModel();
  }
}
