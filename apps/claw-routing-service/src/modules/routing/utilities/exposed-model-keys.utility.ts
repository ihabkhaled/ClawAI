import {
  MODEL_EXPOSURE_EXPOSED,
  MODEL_KIND_CHAT,
} from '../constants/cloud-router-eligibility.constants';
import type { ExposedModelSnapshotEntry } from '../types/model-deployment.types';
import { modelMatchKey } from './cloud-router-candidates.utility';

/** Match keys of the exposed chat models in a connector snapshot (media and hidden models dropped). */
export function exposedChatKeys(models: readonly ExposedModelSnapshotEntry[]): Set<string> {
  return new Set(
    models
      .filter(
        (model) =>
          model.exposure === MODEL_EXPOSURE_EXPOSED &&
          (model.kind ?? MODEL_KIND_CHAT) === MODEL_KIND_CHAT,
      )
      .map((model) => modelMatchKey(model.provider, model.modelKey)),
  );
}
