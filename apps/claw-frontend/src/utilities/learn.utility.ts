import { LEARN_CONTENT_BY_LOCALE } from '@/constants/learn-content.constants';
import {
  LEARN_RELATED_PATHS,
  LEARN_TOPIC_ORDER,
  getLearnTopicPath,
} from '@/constants/learn.constants';
import type { LearnTopic } from '@/enums/learn-topic.enum';
import type { Locale } from '@/enums/locale.enum';
import type {
  LearnDictionary,
  LearnHubCard,
  LearnRelatedLink,
  LearnSiblingLink,
  ResolvedLearnTopic,
} from '@/types/learn.types';
import { localisePath } from '@/utilities/locale.utility';
import { formatProductCounts } from '@/utilities/product-counts.utility';

export function getLearnContent(locale: Locale): LearnDictionary {
  return LEARN_CONTENT_BY_LOCALE[locale];
}

/**
 * A topic's copy with every product-count placeholder resolved.
 *
 * Applied at the edge of the content layer rather than inside each component,
 * so a component can never render a raw `{connectorCount}` by forgetting to
 * call the formatter. Every string a page displays passes through here.
 */
export function getLearnTopic(locale: Locale, topic: LearnTopic): ResolvedLearnTopic {
  const content = getLearnContent(locale).topics[topic];
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

/** The hub's topic cards, in render order, already localised. */
export function buildLearnHubCards(locale: Locale): LearnHubCard[] {
  const content = getLearnContent(locale);
  return LEARN_TOPIC_ORDER.map((topic) => ({
    topic,
    title: content.topics[topic].title,
    summary: formatProductCounts(content.hub.cardSummaries[topic]),
    href: localisePath(getLearnTopicPath(topic), locale),
  }));
}

/**
 * The "where to go next" links for a topic.
 *
 * Editorial per topic (see `LEARN_RELATED_PATHS`) rather than computed from
 * adjacency, and localised so a reader never leaves their language.
 */
export function buildLearnRelatedLinks(locale: Locale, topic: LearnTopic): LearnRelatedLink[] {
  return LEARN_RELATED_PATHS[topic].map((path) => ({
    path,
    href: localisePath(path, locale),
  }));
}

/**
 * Sibling topics for the in-page rail, excluding the current one.
 *
 * Capped at four. A rail listing all seventeen siblings is a link dump that
 * dilutes every link in it, which is the opposite of what internal linking is
 * for.
 */
export function buildLearnSiblings(locale: Locale, exclude: LearnTopic): LearnSiblingLink[] {
  const content = getLearnContent(locale);
  const order = LEARN_TOPIC_ORDER.filter((topic) => topic !== exclude);
  const index = LEARN_TOPIC_ORDER.indexOf(exclude);
  // Take the topics adjacent to this one, wrapping, so every page's rail is
  // different and each topic is linked from roughly as many pages as any other.
  const rotated = [...order.slice(index), ...order.slice(0, index)];
  return rotated.slice(0, 4).map((topic) => ({
    topic,
    title: content.topics[topic].title,
    href: localisePath(getLearnTopicPath(topic), locale),
  }));
}
