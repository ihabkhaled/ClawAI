import { MODELS_CONTENT_BY_LOCALE } from '@/constants/models-content.constants';
import {
  MODEL_PROVIDER_ORDER,
  MODEL_PROVIDER_RELATED_PATHS,
  getModelProviderPath,
} from '@/constants/models.constants';
import type { Locale } from '@/enums/locale.enum';
import type { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type {
  ModelHubCard,
  ModelRelatedLink,
  ModelSiblingLink,
  ModelsDictionary,
  ResolvedModelProvider,
} from '@/types/models.types';
import { localisePath } from '@/utilities/locale.utility';

export function getModelsContent(locale: Locale): ModelsDictionary {
  return MODELS_CONTENT_BY_LOCALE[locale];
}

export function getModelProviderContent(
  locale: Locale,
  provider: ModelProviderPage,
): ResolvedModelProvider {
  return getModelsContent(locale).providers[provider];
}

/** The hub's provider cards, in render order, already localised. */
export function buildModelHubCards(locale: Locale): ModelHubCard[] {
  const content = getModelsContent(locale);
  return MODEL_PROVIDER_ORDER.map((provider) => ({
    provider,
    title: content.providers[provider].title,
    summary: content.hub.cardSummaries[provider],
    href: localisePath(getModelProviderPath(provider), locale),
  }));
}

export function buildModelRelatedLinks(
  locale: Locale,
  provider: ModelProviderPage,
): ModelRelatedLink[] {
  return MODEL_PROVIDER_RELATED_PATHS[provider].map((path) => ({
    path,
    href: localisePath(path, locale),
  }));
}

/** Sibling providers for the in-page rail, capped at four, wrapping the order array. */
export function buildModelSiblings(locale: Locale, exclude: ModelProviderPage): ModelSiblingLink[] {
  const content = getModelsContent(locale);
  const order = MODEL_PROVIDER_ORDER.filter((provider) => provider !== exclude);
  const index = MODEL_PROVIDER_ORDER.indexOf(exclude);
  const rotated = [...order.slice(index), ...order.slice(0, index)];
  return rotated.slice(0, 4).map((provider) => ({
    provider,
    title: content.providers[provider].title,
    href: localisePath(getModelProviderPath(provider), locale),
  }));
}
