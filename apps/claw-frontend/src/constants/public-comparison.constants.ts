import { ComparisonDimension } from '@/enums/comparison-dimension.enum';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';

/**
 * The date the claims on every comparison page were last checked against each
 * vendor's public documentation.
 *
 * Printed on the page, and emitted as `dateModified` in the structured data. A
 * comparison without a visible date is a claim with no expiry, and these
 * products change monthly — move this only when the copy has actually been
 * re-checked, never as part of an unrelated edit.
 */
export const COMPARISON_REVIEW_DATE = '2026-08-27';

/**
 * Render order for the matrix rows.
 *
 * Identical on every page, so a reader can open two comparisons in two tabs and
 * the rows line up. Changing the order changes it everywhere by construction.
 */
export const COMPARISON_DIMENSION_ORDER: ReadonlyArray<ComparisonDimension> = [
  ComparisonDimension.MODEL_CHOICE,
  ComparisonDimension.ROUTING,
  ComparisonDimension.SIDE_BY_SIDE,
  ComparisonDimension.LOCAL_MODELS,
  ComparisonDimension.SELF_HOSTING,
  ComparisonDimension.MEMORY_AND_FILES,
  ComparisonDimension.CONNECTORS,
  ComparisonDimension.RECEIPTS,
];

/** Order the rivals appear in on the hub and in the cross-links. */
export const COMPARISON_RIVAL_ORDER: ReadonlyArray<ComparisonRival> = [
  ComparisonRival.CHATGPT,
  ComparisonRival.CLAUDE,
  ComparisonRival.GEMINI,
  ComparisonRival.PERPLEXITY,
  ComparisonRival.COPILOT,
  ComparisonRival.KIMI,
  ComparisonRival.QWEN,
  ComparisonRival.GLM,
  ComparisonRival.DEEPSEEK,
];

export const COMPARISON_HUB_PATH = '/compare';

/**
 * The placeholder a translated label uses to position the rival's name.
 *
 * Not a prefix-plus-name concatenation: word order is not universal, and
 * "Where {rival} is strong" has to be able to put the name last in Japanese and
 * first in English without the component knowing which language it is in.
 */
export const COMPARISON_RIVAL_TOKEN = '{rival}';

export const COMPARISON_SLUG_BY_RIVAL: Record<ComparisonRival, LaunchPublicPageSlug> = {
  [ComparisonRival.CHATGPT]: LaunchPublicPageSlug.COMPARE_CHATGPT,
  [ComparisonRival.CLAUDE]: LaunchPublicPageSlug.COMPARE_CLAUDE,
  [ComparisonRival.GEMINI]: LaunchPublicPageSlug.COMPARE_GEMINI,
  [ComparisonRival.PERPLEXITY]: LaunchPublicPageSlug.COMPARE_PERPLEXITY,
  [ComparisonRival.COPILOT]: LaunchPublicPageSlug.COMPARE_COPILOT,
  [ComparisonRival.KIMI]: LaunchPublicPageSlug.COMPARE_KIMI,
  [ComparisonRival.QWEN]: LaunchPublicPageSlug.COMPARE_QWEN,
  [ComparisonRival.GLM]: LaunchPublicPageSlug.COMPARE_GLM,
  [ComparisonRival.DEEPSEEK]: LaunchPublicPageSlug.COMPARE_DEEPSEEK,
};

export const COMPARISON_PATH_BY_RIVAL: Record<ComparisonRival, string> = {
  [ComparisonRival.CHATGPT]: `${COMPARISON_HUB_PATH}/${ComparisonRival.CHATGPT}`,
  [ComparisonRival.CLAUDE]: `${COMPARISON_HUB_PATH}/${ComparisonRival.CLAUDE}`,
  [ComparisonRival.GEMINI]: `${COMPARISON_HUB_PATH}/${ComparisonRival.GEMINI}`,
  [ComparisonRival.PERPLEXITY]: `${COMPARISON_HUB_PATH}/${ComparisonRival.PERPLEXITY}`,
  [ComparisonRival.COPILOT]: `${COMPARISON_HUB_PATH}/${ComparisonRival.COPILOT}`,
  [ComparisonRival.KIMI]: `${COMPARISON_HUB_PATH}/${ComparisonRival.KIMI}`,
  [ComparisonRival.QWEN]: `${COMPARISON_HUB_PATH}/${ComparisonRival.QWEN}`,
  [ComparisonRival.GLM]: `${COMPARISON_HUB_PATH}/${ComparisonRival.GLM}`,
  [ComparisonRival.DEEPSEEK]: `${COMPARISON_HUB_PATH}/${ComparisonRival.DEEPSEEK}`,
};

/** Anchor ids for the in-page section nav. Stable, so deep links keep working. */
export const COMPARISON_SECTION_IDS = {
  glance: 'at-a-glance',
  strength: 'their-strength',
  difference: 'our-difference',
  choose: 'which-to-choose',
  faq: 'questions',
} as const;
