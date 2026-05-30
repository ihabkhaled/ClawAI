import type { StreamBottleneck } from '@/types';

// Maps each bottleneck stage to its i18n label key. Lives alongside the
// component that consumes it so the locale namespace stays centralized.
export const BOTTLENECK_LABEL_KEYS: Record<StreamBottleneck['stage'], string> = {
  modelLoad: 'runtimeProgress.bottleneck.modelLoad',
  promptEval: 'runtimeProgress.bottleneck.promptEval',
  generation: 'runtimeProgress.bottleneck.generation',
};
