'use client';

import { useCallback, useMemo, useState } from 'react';

import {
  DEFAULT_RUNTIME_CONFIG_DRAFT,
  LOCAL_FRONTIER_SEARCH_DEBOUNCE_MS,
} from '@/constants/local-frontier.constants';
import {
  FrontierPullJobStatus,
  HardwareCompat,
  type FrontierModelCategory,
  type FrontierQualityTier,
} from '@/enums/local-frontier.enum';
import { useDebounce } from '@/hooks/common/use-debounce';
import { useTranslation } from '@/lib/i18n';
import type {
  DownloadJobView,
  LocalFrontierPageController,
  RuntimeConfigDraft,
} from '@/types/local-frontier-ui.types';
import type { CompatChipMeta, FrontierCatalogEntry } from '@/types/local-frontier.types';
import { classifyCompat } from '@/utilities/local-frontier-compat.utility';

import { useCancelPull } from './use-cancel-pull';
import { useDeleteWeights } from './use-delete-weights';
import { useFrontierCatalog } from './use-frontier-catalog';
import { useHardwareSnapshot } from './use-hardware-snapshot';
import { useInitiatePull } from './use-initiate-pull';
import { useLoadModel, useUnloadModel } from './use-load-model';
import { useLoadedModel } from './use-loaded-model';
import { usePullJobs } from './use-pull-jobs';
import { usePullProgressSse } from './use-pull-progress-sse';
import { useRefreshCatalog } from './use-refresh-catalog';
import { useRefreshHardware } from './use-refresh-hardware';
import { useRetryPull } from './use-retry-pull';
import { useRuntimeInfo } from './use-runtime-info';
import { useUpdateRuntimeConfig } from './use-update-runtime-config';

export function useLocalFrontierCatalogPage(): LocalFrontierPageController {
  const { t } = useTranslation();
  const [category, setCategory] = useState<FrontierModelCategory | undefined>();
  const [qualityTier, setQualityTier] = useState<FrontierQualityTier | undefined>();
  const [compatibleOnly, setCompatibleOnly] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const debouncedSearch = useDebounce(searchInput, LOCAL_FRONTIER_SEARCH_DEBOUNCE_MS);

  const [deleteEntry, setDeleteEntry] = useState<FrontierCatalogEntry | null>(null);
  const [deleteInputValue, setDeleteInputValue] = useState<string>('');

  const [overrideEntry, setOverrideEntry] = useState<FrontierCatalogEntry | null>(null);
  const [overrideCompat, setOverrideCompat] = useState<CompatChipMeta | null>(null);

  const [configEntry, setConfigEntry] = useState<FrontierCatalogEntry | null>(null);
  const [configDraft, setConfigDraft] = useState<RuntimeConfigDraft>(DEFAULT_RUNTIME_CONFIG_DRAFT);

  const [hfDialogOpen, setHfDialogOpen] = useState<boolean>(false);

  const trimmedSearch = debouncedSearch.trim();
  const filters = useMemo(
    () => ({
      category,
      qualityTier,
      compatibleOnly,
      limit: 50,
      ...(trimmedSearch.length > 0 ? { search: trimmedSearch } : {}),
    }),
    [category, qualityTier, compatibleOnly, trimmedSearch],
  );

  const catalogQuery = useFrontierCatalog(filters);
  const hardwareQuery = useHardwareSnapshot();
  const runtimeQuery = useRuntimeInfo();
  const loadedQuery = useLoadedModel();
  const jobsQuery = usePullJobs();
  const initiate = useInitiatePull();
  const cancel = useCancelPull();
  const retry = useRetryPull();
  const refreshCatalog = useRefreshCatalog();
  const refreshHardware = useRefreshHardware();
  const load = useLoadModel();
  const unload = useUnloadModel();
  const remove = useDeleteWeights();
  const updateConfig = useUpdateRuntimeConfig();

  const entries = useMemo(() => catalogQuery.data?.data ?? [], [catalogQuery.data?.data]);
  const pullJobs = useMemo(() => jobsQuery.data?.rows ?? [], [jobsQuery.data?.rows]);
  const activeJob = pullJobs.find(
    (job) =>
      job.status === FrontierPullJobStatus.RUNNING || job.status === FrontierPullJobStatus.PENDING,
  );
  const liveProgress = usePullProgressSse(activeJob?.id ?? null);

  const compatByEntry = useMemo(() => {
    const map = new Map<string, CompatChipMeta>();
    for (const entry of entries) {
      map.set(entry.id, classifyCompat(entry, hardwareQuery.data));
    }
    return map;
  }, [entries, hardwareQuery.data]);

  const downloadViews = useMemo<DownloadJobView[]>(() => {
    return pullJobs.map((job) => ({
      job,
      progress: activeJob && job.id === activeJob.id ? liveProgress : null,
      entry: entries.find((entry) => entry.id === job.modelId),
    }));
  }, [pullJobs, entries, activeJob, liveProgress]);

  const handlePullClick = useCallback(
    (entry: FrontierCatalogEntry): void => {
      const compat = compatByEntry.get(entry.id);
      if (compat && compat.chip !== HardwareCompat.FITS) {
        setOverrideEntry(entry);
        setOverrideCompat(compat);
        return;
      }
      initiate.mutate({ modelId: entry.id, overrideHardwareGate: false });
    },
    [compatByEntry, initiate],
  );

  const handleOverrideConfirm = useCallback((): void => {
    if (overrideEntry) {
      initiate.mutate({ modelId: overrideEntry.id, overrideHardwareGate: true });
    }
    setOverrideEntry(null);
    setOverrideCompat(null);
  }, [overrideEntry, initiate]);

  const handleDeleteClick = useCallback((entry: FrontierCatalogEntry): void => {
    setDeleteEntry(entry);
    setDeleteInputValue('');
  }, []);

  const handleDeleteConfirm = useCallback((): void => {
    if (deleteEntry) {
      remove.mutate(
        { modelId: deleteEntry.id, confirmName: deleteInputValue.trim() },
        {
          onSuccess: () => {
            setDeleteEntry(null);
            setDeleteInputValue('');
          },
        },
      );
    }
  }, [deleteEntry, deleteInputValue, remove]);

  const handleConfigureClick = useCallback((entry: FrontierCatalogEntry): void => {
    setConfigEntry(entry);
    setConfigDraft(DEFAULT_RUNTIME_CONFIG_DRAFT);
  }, []);

  const handleConfigureSave = useCallback((): void => {
    if (configEntry) {
      updateConfig.mutate(
        { modelId: configEntry.id, payload: configDraft },
        {
          onSuccess: () => {
            setConfigEntry(null);
          },
        },
      );
    }
  }, [configEntry, configDraft, updateConfig]);

  return {
    t,
    entries,
    total: catalogQuery.data?.total ?? 0,
    isLoading: catalogQuery.isLoading,
    isError: catalogQuery.isError,
    hardware: hardwareQuery.data,
    runtime: runtimeQuery.data,
    loaded: loadedQuery.data ?? null,
    pullJobs,
    downloadViews,
    compatByEntry,
    category,
    qualityTier,
    compatibleOnly,
    searchInput,
    setSearchInput,
    setCategory,
    setQualityTier,
    setCompatibleOnly,
    isPullPending: initiate.isPending,
    isRefreshingCatalog: refreshCatalog.isPending,
    isRefreshingHardware: refreshHardware.isPending,
    isUpdatingConfig: updateConfig.isPending,
    isDeleting: remove.isPending,
    handlePullClick,
    handleCancel: (jobId: string): void => cancel.mutate(jobId),
    handleRetry: (jobId: string): void => retry.mutate(jobId),
    handleRefreshCatalog: (): void => refreshCatalog.mutate(),
    handleRefreshHardware: (): void => refreshHardware.mutate(),
    handleLoad: (entry: FrontierCatalogEntry): void => load.mutate(entry.id),
    handleUnload: (entry: FrontierCatalogEntry): void => unload.mutate(entry.id),
    handleUnloadCurrent: (): void => {
      if (loadedQuery.data) {
        unload.mutate(loadedQuery.data.id);
      }
    },
    deleteDialogOpen: deleteEntry !== null,
    deleteEntry,
    deleteInputValue,
    setDeleteInputValue,
    handleDeleteClick,
    handleDeleteCancel: (): void => {
      setDeleteEntry(null);
      setDeleteInputValue('');
    },
    handleDeleteConfirm,
    overrideDialogOpen: overrideEntry !== null,
    overrideEntry,
    overrideCompat,
    handleOverrideCancel: (): void => {
      setOverrideEntry(null);
      setOverrideCompat(null);
    },
    handleOverrideConfirm,
    configDialogOpen: configEntry !== null,
    configDraft,
    setConfigDraft,
    handleConfigureClick,
    handleConfigureCancel: (): void => {
      setConfigEntry(null);
    },
    handleConfigureSave,
    hfDialogOpen,
    setHfDialogOpen,
    openHfDialog: (): void => setHfDialogOpen(true),
  };
}
