import type { ResearchMode } from '../../../common/enums/research-mode.enum';

/** Options for the shared research runner used by every chat flow. */
export type ResearchIntentOptions = {
  mode?: ResearchMode | string;
  providerId?: string;
  forcedProvider?: string;
  forcedModel?: string;
  fileIds?: readonly string[];
};
