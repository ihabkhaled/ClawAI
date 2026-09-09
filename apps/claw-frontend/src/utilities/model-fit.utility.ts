import { MODEL_FIT_CONTENT_BY_LOCALE } from '@/constants/model-fit-content.constants';
import {
  MODEL_FIT_RELATED_PATHS,
  MODEL_FIT_TASK_ORDER,
  getModelFitTaskPath,
} from '@/constants/model-fit.constants';
import type { Locale } from '@/enums/locale.enum';
import type { ModelFitTask } from '@/enums/model-fit-task.enum';
import type {
  ModelFitDictionary,
  ModelFitHubCard,
  ModelFitRelatedLink,
  ModelFitSiblingLink,
  ResolvedModelFitTask,
} from '@/types/model-fit.types';
import { localisePath } from '@/utilities/locale.utility';

export function getModelFitContent(locale: Locale): ModelFitDictionary {
  return MODEL_FIT_CONTENT_BY_LOCALE[locale];
}

export function getModelFitTaskContent(locale: Locale, task: ModelFitTask): ResolvedModelFitTask {
  return getModelFitContent(locale).tasks[task];
}

/** The hub's task cards, in render order, already localised. */
export function buildModelFitHubCards(locale: Locale): ModelFitHubCard[] {
  const content = getModelFitContent(locale);
  return MODEL_FIT_TASK_ORDER.map((task) => ({
    task,
    title: content.tasks[task].title,
    summary: content.hub.cardSummaries[task],
    href: localisePath(getModelFitTaskPath(task), locale),
  }));
}

export function buildModelFitRelatedLinks(
  locale: Locale,
  task: ModelFitTask,
): ModelFitRelatedLink[] {
  return MODEL_FIT_RELATED_PATHS[task].map((path) => ({
    path,
    href: localisePath(path, locale),
  }));
}

/** Sibling tasks for the in-page rail, capped at four, wrapping the order array. */
export function buildModelFitSiblings(
  locale: Locale,
  exclude: ModelFitTask,
): ModelFitSiblingLink[] {
  const content = getModelFitContent(locale);
  const order = MODEL_FIT_TASK_ORDER.filter((task) => task !== exclude);
  const index = MODEL_FIT_TASK_ORDER.indexOf(exclude);
  const rotated = [...order.slice(index), ...order.slice(0, index)];
  return rotated.slice(0, 4).map((task) => ({
    task,
    title: content.tasks[task].title,
    href: localisePath(getModelFitTaskPath(task), locale),
  }));
}
