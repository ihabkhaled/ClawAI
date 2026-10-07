import { THREAD_STAGE_LABEL_KEYS } from '@/constants/thread-generation-stage.constants';
import type { ThreadGenerationStage } from '@/enums/thread-generation-stage.enum';

/** The label key for a stage the service reported, or null for one this build does not know. */
export function threadStageLabelKey(stage: string): string | null {
  return THREAD_STAGE_LABEL_KEYS[stage as ThreadGenerationStage] ?? null;
}
