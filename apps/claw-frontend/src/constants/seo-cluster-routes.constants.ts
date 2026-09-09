import { INTEGRATION_TOPIC_ORDER, getIntegrationPath } from '@/constants/integrations.constants';
import { LEARN_TOPIC_ORDER, getLearnTopicPath } from '@/constants/learn.constants';
import { MODEL_FIT_TASK_ORDER, getModelFitTaskPath } from '@/constants/model-fit.constants';
import { MODEL_PROVIDER_ORDER, getModelProviderPath } from '@/constants/models.constants';

/**
 * Dynamic marketing routes whose children are a KNOWN, fixed set.
 *
 * There are two kinds of dynamic route under `(marketing)` and they need
 * opposite treatment from `sitemap-coverage.test.ts`:
 *
 * - **Data-driven** — `/share/chat/[publicShareId]`. The URLs come from the
 *   database and there is no fixed path to register. Exempt from the
 *   route-versus-registry check; its sitemap entries are asserted separately.
 * - **Cluster** — `/learn/[topic]`. One file standing for eighteen reviewed
 *   pages that each DO have a registry entry (ADR-084). Exempting these would
 *   silently reopen the hole that test exists to close, in both directions: a
 *   registry entry with no route would look fine, and a route with no entry
 *   would too.
 *
 * So a cluster route expands here into the paths it actually serves, from the
 * same order array `generateStaticParams` uses. The expansion cannot drift from
 * the route, because both read one source.
 */
export const SEO_CLUSTER_ROUTE_EXPANSIONS: Readonly<Record<string, ReadonlyArray<string>>> =
  Object.freeze({
    '/learn/[topic]': LEARN_TOPIC_ORDER.map(getLearnTopicPath),
    '/integrations/[topic]': INTEGRATION_TOPIC_ORDER.map(getIntegrationPath),
    '/model-providers/[provider]': MODEL_PROVIDER_ORDER.map(getModelProviderPath),
    '/model-fit/[task]': MODEL_FIT_TASK_ORDER.map(getModelFitTaskPath),
  });

/**
 * Dynamic routes with no fixed children, exempt from the registry check.
 *
 * Listed explicitly rather than inferred, so a new data-driven route forces
 * somebody to decide deliberately whether its URLs reach the sitemap.
 */
export const DATA_DRIVEN_MARKETING_ROUTES: ReadonlyArray<string> = ['/share/chat/[publicShareId]'];
