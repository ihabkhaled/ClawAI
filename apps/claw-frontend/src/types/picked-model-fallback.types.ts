import type { CreditFallbackReason } from '@/enums/credit-fallback-reason.enum';
import type { RegenerateMessageRequest } from '@/types/chat.types';
import type { ModelPickerProps } from '@/types/component.types';
import type { TranslateFunction } from '@/types/i18n.types';

/**
 * `metadata.pickedModelFallback`, written by chat-service when a SUBSTITUTE
 * answered for the model the user picked. `costlier` is true when the substitute
 * is in a higher cost class, so the notice can say so.
 */
export type PickedModelFallbackInfo = {
  originalProvider: string;
  originalModel: string;
  costlier: boolean;
};

/** A provider/model pair offered as a one-click retry. */
export type SuggestedModelRef = {
  provider: string;
  model: string;
};

/** A suggestion with the name the button shows. */
export type SuggestedModelChoice = SuggestedModelRef & {
  label: string;
};

export type PickedModelFallbackNoticeProps = {
  info: PickedModelFallbackInfo;
  /** The model that actually answered (the message's own model). */
  answeredModel: string;
  t: TranslateFunction;
};

export type PickedModelRecoveryProps = {
  /** What the backend suggested (stored on the error message); may be empty. */
  suggested: readonly SuggestedModelRef[];
  failedProvider: string | null;
  failedModel: string | null;
  onPick: (choice: RegenerateMessageRequest) => void;
};

/** What usePickedModelRecovery hands the recovery component. */
export type PickedModelRecoveryState = {
  suggestions: SuggestedModelChoice[];
  pickerProps: ModelPickerProps;
};

/**
 * `metadata.creditFallback`, written by chat-service when a credit model was
 * refused (connector credit or free requests used up) and an included model
 * answered instead, so no credit was spent.
 */
export type CreditFallbackInfo = {
  originalProvider: string;
  originalModel: string;
  reason: CreditFallbackReason;
};

export type CreditFallbackNoticeProps = {
  info: CreditFallbackInfo;
  /** The model that actually answered (the message's own model). */
  answeredModel: string;
  t: TranslateFunction;
};
