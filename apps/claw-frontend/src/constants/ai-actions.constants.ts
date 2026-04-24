import type { ModelSelection } from '@/types';

export const AUTO_GROUP_PROVIDER = 'AUTO';

export const AUTO_MODEL: ModelSelection = {
  provider: AUTO_GROUP_PROVIDER,
  model: 'auto',
  displayName: 'AUTO (router picks)',
};

export const AI_ACTION_IMAGE_PROVIDERS: ReadonlySet<string> = new Set([
  'IMAGE_OPENAI',
  'IMAGE_GEMINI',
  'IMAGE_LOCAL',
]);
