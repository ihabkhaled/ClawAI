import { type MediaCapabilityState } from '../../../common/enums/media-capability-state.enum';

/** What one (provider, model) can take natively, per media kind. */
export type ModelMediaCapabilities = {
  vision: MediaCapabilityState;
  audioInput: MediaCapabilityState;
  videoInput: MediaCapabilityState;
};

/** One row of connector-service's `GET /internal/connectors/models-snapshot`. */
export type ModelsSnapshotEntry = {
  provider: string;
  modelKey: string;
  modalitiesIn?: string[];
  exposure?: string;
  kind?: string;
};

/** The snapshot keyed by `modelMatchKey(provider, modelKey)`. */
export type ModelsSnapshotIndex = ReadonlyMap<string, ModelsSnapshotEntry>;

/** A model a user could pick instead, in the id shape the catalog uses. */
export type MediaCapableModel = {
  provider: string;
  model: string;
};

/**
 * What the video router needs: the selected model's catalog answer and every
 * video-capable exposed chat model, or null when the snapshot is unavailable.
 */
export type VideoRoutingCapability = {
  selected: MediaCapabilityState;
  capableModels: MediaCapableModel[] | null;
};
