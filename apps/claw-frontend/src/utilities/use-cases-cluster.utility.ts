import { USE_CASES_CLUSTER_CONTENT_BY_LOCALE } from '@/constants/use-cases-cluster-content.constants';
import {
  USE_CASES_RELATED_PATHS,
  USE_CASES_TASK_ORDER,
  getUseCaseTaskPath,
} from '@/constants/use-cases-cluster.constants';
import type { Locale } from '@/enums/locale.enum';
import type { UseCaseTask } from '@/enums/use-case-task.enum';
import type {
  UseCaseHubCard,
  UseCaseRelatedLink,
  UseCaseSiblingLink,
  UseCaseTaskContent,
  UseCasesClusterDictionary,
} from '@/types/use-cases-cluster.types';
import { localisePath } from '@/utilities/locale.utility';

export function getUseCasesClusterContent(locale: Locale): UseCasesClusterDictionary {
  return USE_CASES_CLUSTER_CONTENT_BY_LOCALE[locale];
}

export function getUseCaseTaskContent(locale: Locale, task: UseCaseTask): UseCaseTaskContent {
  return getUseCasesClusterContent(locale).tasks[task];
}

/** The hub's task cards, in render order, already localised. */
export function buildUseCaseHubCards(locale: Locale): UseCaseHubCard[] {
  const content = getUseCasesClusterContent(locale);
  return USE_CASES_TASK_ORDER.map((task) => ({
    task,
    title: content.tasks[task].title,
    summary: content.hub.cardSummaries[task],
    href: localisePath(getUseCaseTaskPath(task), locale),
  }));
}

export function buildUseCaseRelatedLinks(locale: Locale, task: UseCaseTask): UseCaseRelatedLink[] {
  return USE_CASES_RELATED_PATHS[task].map((path) => ({
    path,
    href: localisePath(path, locale),
  }));
}

/** Sibling tasks for the in-page rail, capped at four, wrapping the order array. */
export function buildUseCaseSiblings(locale: Locale, exclude: UseCaseTask): UseCaseSiblingLink[] {
  const content = getUseCasesClusterContent(locale);
  const order = USE_CASES_TASK_ORDER.filter((task) => task !== exclude);
  const index = USE_CASES_TASK_ORDER.indexOf(exclude);
  const rotated = [...order.slice(index), ...order.slice(0, index)];
  return rotated.slice(0, 4).map((task) => ({
    task,
    title: content.tasks[task].title,
    href: localisePath(getUseCaseTaskPath(task), locale),
  }));
}
