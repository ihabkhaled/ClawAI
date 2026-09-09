import { PROMPT_GUIDE_CONTENT_BY_LOCALE } from '@/constants/prompt-guide-content.constants';
import {
  PROMPT_GUIDE_RELATED_PATHS,
  PROMPT_GUIDE_TOPIC_ORDER,
  getPromptGuideTopicPath,
} from '@/constants/prompts.constants';
import type { Locale } from '@/enums/locale.enum';
import type { PromptGuideTopic } from '@/enums/prompt-guide-topic.enum';
import type {
  PromptGuideDictionary,
  PromptGuideHubCard,
  PromptGuideRelatedLink,
  PromptGuideSiblingLink,
  ResolvedPromptGuideTopic,
} from '@/types/prompt-guide.types';
import { localisePath } from '@/utilities/locale.utility';

export function getPromptGuideContent(locale: Locale): PromptGuideDictionary {
  return PROMPT_GUIDE_CONTENT_BY_LOCALE[locale];
}

export function getPromptGuideTopicContent(
  locale: Locale,
  topic: PromptGuideTopic,
): ResolvedPromptGuideTopic {
  return getPromptGuideContent(locale).topics[topic];
}

/** The hub's topic cards, in render order, already localised. */
export function buildPromptGuideHubCards(locale: Locale): PromptGuideHubCard[] {
  const content = getPromptGuideContent(locale);
  return PROMPT_GUIDE_TOPIC_ORDER.map((topic) => ({
    topic,
    title: content.topics[topic].title,
    summary: content.hub.cardSummaries[topic],
    href: localisePath(getPromptGuideTopicPath(topic), locale),
  }));
}

export function buildPromptGuideRelatedLinks(
  locale: Locale,
  topic: PromptGuideTopic,
): PromptGuideRelatedLink[] {
  return PROMPT_GUIDE_RELATED_PATHS[topic].map((path) => ({
    path,
    href: localisePath(path, locale),
  }));
}

/** Sibling topics for the in-page rail, capped at four, wrapping the order array. */
export function buildPromptGuideSiblings(
  locale: Locale,
  exclude: PromptGuideTopic,
): PromptGuideSiblingLink[] {
  const content = getPromptGuideContent(locale);
  const order = PROMPT_GUIDE_TOPIC_ORDER.filter((topic) => topic !== exclude);
  const index = PROMPT_GUIDE_TOPIC_ORDER.indexOf(exclude);
  const rotated = [...order.slice(index), ...order.slice(0, index)];
  return rotated.slice(0, 4).map((topic) => ({
    topic,
    title: content.topics[topic].title,
    href: localisePath(getPromptGuideTopicPath(topic), locale),
  }));
}
