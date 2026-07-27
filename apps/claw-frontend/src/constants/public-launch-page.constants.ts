import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';

export const PUBLIC_LAUNCH_EFFECTIVE_DATE = '2026-07-27';

export const LEGAL_PUBLIC_LAUNCH_SLUGS: ReadonlySet<PublicLaunchPageSlug> = new Set([
  PublicLaunchPageSlug.PRIVACY,
  PublicLaunchPageSlug.TERMS,
  PublicLaunchPageSlug.COOKIES,
  PublicLaunchPageSlug.ACCEPTABLE_USE,
]);

export const IMPLEMENTED_PROVIDER_FAMILIES = [
  'OpenAI',
  'Anthropic',
  'Google Gemini',
  'DeepSeek',
  'xAI Grok',
  'Ollama',
  'llama.cpp',
] as const;
