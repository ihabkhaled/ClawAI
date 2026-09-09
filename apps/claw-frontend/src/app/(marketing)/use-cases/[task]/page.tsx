import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { UseCaseTaskPage as UseCaseTaskPageComponent } from '@/components/marketing/use-cases/use-case-task-page';
import {
  USE_CASES_TASK_ORDER,
  getUseCaseTaskSlug,
  isUseCaseTask,
} from '@/constants/use-cases-cluster.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import type { UseCaseTaskRouteProps } from '@/types/use-cases-route.types';

/**
 * One route file for all seven task pages (ADR-084), mirroring the
 * `/model-fit/[task]` pattern. An unmatched segment 404s rather than
 * rendering an empty shell.
 */
export function generateStaticParams(): Array<{ task: string }> {
  return USE_CASES_TASK_ORDER.map((task) => ({ task }));
}

export async function generateMetadata({ params }: UseCaseTaskRouteProps): Promise<Metadata> {
  const { task } = await params;
  if (!isUseCaseTask(task)) {
    return {};
  }
  return buildRequestPublicPageMetadata(getUseCaseTaskSlug(task));
}

export default async function UseCaseTaskRoute({
  params,
}: UseCaseTaskRouteProps): Promise<React.ReactElement> {
  const { task } = await params;
  if (!isUseCaseTask(task)) {
    notFound();
  }
  return UseCaseTaskPageComponent({ task });
}
