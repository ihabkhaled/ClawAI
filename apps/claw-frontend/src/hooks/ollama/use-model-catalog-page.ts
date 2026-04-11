import { useCallback, useState } from 'react';

import { CATALOG_PAGE_SIZE } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import type { PullJobResponse, UseModelCatalogPageReturn } from '@/types';

import { useCancelPullJob } from './use-cancel-pull-job';
import { useModelCatalog } from './use-model-catalog';
import { usePullFromCatalog } from './use-pull-from-catalog';
import { usePullJobs } from './use-pull-jobs';

export function useModelCatalogPage(): UseModelCatalogPageReturn {
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const { entries, meta, isLoading, isError } = useModelCatalog({
    category,
    search: search || undefined,
    page: 1,
    limit: CATALOG_PAGE_SIZE,
  });

  const { pullFromCatalog, isPending: isPullPending } = usePullFromCatalog();
  const { pullJobs, isLoading: isPullJobsLoading, hasActiveJobs } = usePullJobs();
  const { cancelJob, isPending: isCancelPending } = useCancelPullJob();

  const handleCategoryChange = useCallback((value: string | undefined): void => {
    setCategory(value);
  }, []);

  const handleSearchChange = useCallback((value: string): void => {
    setSearch(value);
  }, []);

  const handlePull = useCallback(
    (catalogId: string): void => {
      pullFromCatalog(catalogId);
    },
    [pullFromCatalog],
  );

  const handleCancelJob = useCallback(
    (jobId: string): void => {
      cancelJob(jobId);
    },
    [cancelJob],
  );

  const getJobForModel = useCallback(
    (modelName: string): PullJobResponse | undefined => {
      return pullJobs.find((j) => j.modelName === modelName);
    },
    [pullJobs],
  );

  return {
    t,
    entries,
    meta,
    isLoading,
    isError,
    category,
    search,
    pullJobs,
    isPullJobsLoading,
    hasActiveJobs,
    handleCategoryChange,
    handleSearchChange,
    handlePull,
    handleCancelJob,
    isPullPending,
    isCancelPending,
    getJobForModel,
  };
}
