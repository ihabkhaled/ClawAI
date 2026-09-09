import { ContentCategory } from '@/enums/content-category.enum';
import { LlmsTxtSection } from '@/enums/llms-txt-section.enum';

/**
 * Which `/llms.txt` section a `ContentCategory` belongs in.
 *
 * `buildLlmsTxt` used to partition pages with three explicit filters — home,
 * comparisons, legal — and dump everything else into "Product" by
 * construction. That is a deny-list: a brand-new cluster's category (`GUIDE`
 * for `/learn`, `WORKSPACE` for `/integrations`) never had to be decided, it
 * just fell into "Product" because nothing excluded it (see
 * `docs/05-frontend/seo-content-architecture.md` §8.5 D3).
 *
 * This is an exhaustive switch instead: every `ContentCategory` member must
 * have a case, so adding a new category without picking its section is a
 * TypeScript compile error, not a silent default. Every category that
 * currently lands in "Product" is listed here explicitly with the same
 * result, so this is a mechanism change only — `/llms.txt` emits exactly what
 * it emitted before for every page that exists today.
 */
export function resolveLlmsTxtSection(category: ContentCategory): LlmsTxtSection {
  switch (category) {
    case ContentCategory.HOME:
      return LlmsTxtSection.HOME;
    case ContentCategory.COMPARISON:
      return LlmsTxtSection.COMPARISONS;
    case ContentCategory.LEGAL:
      return LlmsTxtSection.LEGAL;
    case ContentCategory.PRICING:
    case ContentCategory.ABOUT:
    case ContentCategory.HOW_IT_WORKS:
    case ContentCategory.FEATURES:
    case ContentCategory.ARCHITECTURE:
    case ContentCategory.LOCAL_FIRST:
    case ContentCategory.MULTI_PROVIDER:
    case ContentCategory.MODEL_ROUTING:
    case ContentCategory.ORCHESTRATION:
    case ContentCategory.MEMORY_CONTEXT:
    case ContentCategory.RAG_FILES:
    case ContentCategory.WORKSPACE:
    case ContentCategory.DESKTOP_AGENT:
    case ContentCategory.CODING_AGENT:
    case ContentCategory.SELF_HOSTING:
    case ContentCategory.SECURITY_PRIVACY:
    case ContentCategory.AI_SAFETY:
    case ContentCategory.OBSERVABILITY:
    case ContentCategory.PROVIDERS:
    case ContentCategory.USE_CASES:
    case ContentCategory.GUIDE:
    case ContentCategory.FAQ:
    case ContentCategory.CONTACT:
      return LlmsTxtSection.PRODUCT;
    default: {
      const unhandledCategory: never = category;
      throw new Error(
        `No /llms.txt section mapped for content category "${String(unhandledCategory)}". ` +
          'Add an explicit case in resolveLlmsTxtSection instead of relying on a default bucket.',
      );
    }
  }
}
