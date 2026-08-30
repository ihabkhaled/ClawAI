import { INTEGRATIONS_CONTENT_BY_LOCALE } from '@/constants/integrations-content.constants';
import {
  INTEGRATION_RELATED_PATHS,
  INTEGRATION_TOPIC_ORDER,
  getIntegrationPath,
} from '@/constants/integrations.constants';
import type { IntegrationTopic } from '@/enums/integration-topic.enum';
import type { Locale } from '@/enums/locale.enum';
import type {
  IntegrationHubCard,
  IntegrationRelatedLink,
  IntegrationSiblingLink,
  IntegrationsDictionary,
  ResolvedIntegrationTopic,
} from '@/types/integrations.types';
import { localisePath } from '@/utilities/locale.utility';
import { formatProductCounts } from '@/utilities/product-counts.utility';

export function getIntegrationsContent(locale: Locale): IntegrationsDictionary {
  return INTEGRATIONS_CONTENT_BY_LOCALE[locale];
}

/** A connector's copy with every product-count placeholder resolved. */
export function getIntegrationTopic(
  locale: Locale,
  topic: IntegrationTopic,
): ResolvedIntegrationTopic {
  const content = getIntegrationsContent(locale).topics[topic];
  return {
    ...content,
    summary: formatProductCounts(content.summary),
    productNote: formatProductCounts(content.productNote),
    sections: content.sections.map((section) => ({
      ...section,
      paragraphs: section.paragraphs.map(formatProductCounts),
    })),
    faq: content.faq.map((entry) => ({
      question: entry.question,
      answer: formatProductCounts(entry.answer),
    })),
  };
}

/** The hub's connector cards, in render order, already localised. */
export function buildIntegrationHubCards(locale: Locale): IntegrationHubCard[] {
  const content = getIntegrationsContent(locale);
  return INTEGRATION_TOPIC_ORDER.map((topic) => ({
    topic,
    title: content.topics[topic].title,
    summary: formatProductCounts(content.hub.cardSummaries[topic]),
    href: localisePath(getIntegrationPath(topic), locale),
  }));
}

export function buildIntegrationRelatedLinks(
  locale: Locale,
  topic: IntegrationTopic,
): IntegrationRelatedLink[] {
  return INTEGRATION_RELATED_PATHS[topic].map((path) => ({
    path,
    href: localisePath(path, locale),
  }));
}

/** Sibling connectors for the in-page rail, capped at four, wrapping the order array. */
export function buildIntegrationSiblings(
  locale: Locale,
  exclude: IntegrationTopic,
): IntegrationSiblingLink[] {
  const content = getIntegrationsContent(locale);
  const order = INTEGRATION_TOPIC_ORDER.filter((topic) => topic !== exclude);
  const index = INTEGRATION_TOPIC_ORDER.indexOf(exclude);
  const rotated = [...order.slice(index), ...order.slice(0, index)];
  return rotated.slice(0, 4).map((topic) => ({
    topic,
    title: content.topics[topic].title,
    href: localisePath(getIntegrationPath(topic), locale),
  }));
}
