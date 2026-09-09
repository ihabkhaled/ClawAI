import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ModelFitTaskPage as ModelFitTaskPageComponent } from '@/components/marketing/model-fit/model-fit-task-page';
import {
  MODEL_FIT_TASK_ORDER,
  getModelFitTaskSlug,
  isModelFitTask,
} from '@/constants/model-fit.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import type { ModelFitTaskRouteProps } from '@/types/model-fit-route.types';

/**
 * One route file for all five task pages (ADR-084), mirroring the
 * `/model-providers/[provider]` pattern. An unmatched segment 404s rather
 * than rendering an empty shell.
 */
export function generateStaticParams(): Array<{ task: string }> {
  return MODEL_FIT_TASK_ORDER.map((task) => ({ task }));
}

export async function generateMetadata({ params }: ModelFitTaskRouteProps): Promise<Metadata> {
  const { task } = await params;
  if (!isModelFitTask(task)) {
    return {};
  }
  return buildRequestPublicPageMetadata(getModelFitTaskSlug(task));
}

export default async function ModelFitTaskRoute({
  params,
}: ModelFitTaskRouteProps): Promise<React.ReactElement> {
  const { task } = await params;
  if (!isModelFitTask(task)) {
    notFound();
  }
  return ModelFitTaskPageComponent({ task });
}
