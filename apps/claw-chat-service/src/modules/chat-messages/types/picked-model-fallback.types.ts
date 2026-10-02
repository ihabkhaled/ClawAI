/**
 * A model that may answer when the user's PICKED model fails, as routing-service
 * ranked it (exposed, healthy, on the user's plan). `costlier` means its cost
 * class is above the pick's: the bubble says so.
 */
export type PickedModelSubstitute = {
  provider: string;
  model: string;
  sameProvider: boolean;
  costlier: boolean;
};

/** One provider/model pair offered to the user as a one-click retry. */
export type SuggestedModel = {
  provider: string;
  model: string;
};

/**
 * Stored on the assistant message when a substitute answered for the pick
 * (`metadata.pickedModelFallback`): the bubble reads "X failed, answered by Y".
 */
export type PickedModelFallbackNotice = {
  originalProvider: string;
  originalModel: string;
  costlier: boolean;
};

/** A candidate in a picked-model chain; `substitute` is undefined for the pick itself. */
export type PickedModelCandidate = {
  provider: string;
  model: string;
  substitute?: PickedModelSubstitute;
};
