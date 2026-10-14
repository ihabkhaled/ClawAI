import type { ThreadModelAvailability } from '@/enums/thread-model-availability.enum';
import type { ModelPickerGroup, ModelSelection } from '@/types/component.types';
import type { TranslateFunction } from '@/types/i18n.types';

export type ThreadModelRef = { provider: string; model: string };

/** One seat of the recommended team: the primary model and its backups. */
export type ThreadRecommendedSeat = ThreadModelRef & { fallbacks: ThreadModelRef[] };

export type ThreadRecommendedTeam = {
  authors: ThreadRecommendedSeat[];
  judge: ThreadRecommendedSeat;
  critic: ThreadRecommendedSeat;
};

/** `GET /thread-publications/recommended-team`. */
export type ThreadRecommendedTeamResponse = {
  planName: string;
  /** Null when no model is usable for this account. */
  team: ThreadRecommendedTeam | null;
  models: Array<ThreadModelRef & { status: ThreadModelAvailability }>;
};

/** Availability per `provider::model`; a model the service did not list is absent. */
export type ThreadModelAvailabilityIndex = ReadonlyMap<string, ThreadModelAvailability>;

export type UseThreadModelPickerOptions = {
  onChange: (selection: ModelSelection) => void;
  availability?: ThreadModelAvailabilityIndex;
  planName?: string;
};

export type ThreadModelPickerController = {
  groups: ModelPickerGroup[];
  isLoading: boolean;
  t: TranslateFunction;
  encode: (selection: ModelSelection) => string;
  handleChange: (next: string | null) => void;
};
