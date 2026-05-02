import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FrontierDownloadStatus, HardwareCompat } from '@/enums/local-frontier.enum';
import { useLocalFrontierCatalogPage } from '@/hooks/local-frontier/use-local-frontier-catalog-page';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    catalog: vi.fn(),
    hardware: vi.fn(),
    runtime: vi.fn(),
    loaded: vi.fn(),
    pullJobs: vi.fn(),
    initiate: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
    refreshCatalog: vi.fn(),
    refreshHardware: vi.fn(),
    load: vi.fn(),
    unload: vi.fn(),
    remove: vi.fn(),
    updateConfig: vi.fn(),
    progressSse: vi.fn(),
  },
}));

const useFrontierCatalogMock = vi.fn();
const useHardwareSnapshotMock = vi.fn();
const useRuntimeInfoMock = vi.fn();
const useLoadedModelMock = vi.fn();
const usePullJobsMock = vi.fn();
const useInitiatePullMock = vi.fn();
const useCancelPullMock = vi.fn();
const useRetryPullMock = vi.fn();
const useRefreshCatalogMock = vi.fn();
const useRefreshHardwareMock = vi.fn();
const useLoadModelMock = vi.fn();
const useUnloadModelMock = vi.fn();
const useDeleteWeightsMock = vi.fn();
const useUpdateRuntimeConfigMock = vi.fn();
const usePullProgressSseMock = vi.fn();

vi.mock('@/hooks/local-frontier/use-frontier-catalog', () => ({
  useFrontierCatalog: () => useFrontierCatalogMock(),
}));
vi.mock('@/hooks/local-frontier/use-hardware-snapshot', () => ({
  useHardwareSnapshot: () => useHardwareSnapshotMock(),
}));
vi.mock('@/hooks/local-frontier/use-runtime-info', () => ({
  useRuntimeInfo: () => useRuntimeInfoMock(),
}));
vi.mock('@/hooks/local-frontier/use-loaded-model', () => ({
  useLoadedModel: () => useLoadedModelMock(),
}));
vi.mock('@/hooks/local-frontier/use-pull-jobs', () => ({
  usePullJobs: () => usePullJobsMock(),
}));
vi.mock('@/hooks/local-frontier/use-initiate-pull', () => ({
  useInitiatePull: () => useInitiatePullMock(),
}));
vi.mock('@/hooks/local-frontier/use-cancel-pull', () => ({
  useCancelPull: () => useCancelPullMock(),
}));
vi.mock('@/hooks/local-frontier/use-retry-pull', () => ({
  useRetryPull: () => useRetryPullMock(),
}));
vi.mock('@/hooks/local-frontier/use-refresh-catalog', () => ({
  useRefreshCatalog: () => useRefreshCatalogMock(),
}));
vi.mock('@/hooks/local-frontier/use-refresh-hardware', () => ({
  useRefreshHardware: () => useRefreshHardwareMock(),
}));
vi.mock('@/hooks/local-frontier/use-load-model', () => ({
  useLoadModel: () => useLoadModelMock(),
  useUnloadModel: () => useUnloadModelMock(),
}));
vi.mock('@/hooks/local-frontier/use-delete-weights', () => ({
  useDeleteWeights: () => useDeleteWeightsMock(),
}));
vi.mock('@/hooks/local-frontier/use-update-runtime-config', () => ({
  useUpdateRuntimeConfig: () => useUpdateRuntimeConfigMock(),
}));
vi.mock('@/hooks/local-frontier/use-pull-progress-sse', () => ({
  usePullProgressSse: (jobId: string | null) => usePullProgressSseMock(jobId),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

function makeWrapper(): React.FC<{ children: React.ReactNode }> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return Wrapper;
}

interface FrontierEntryFixture {
  id: string;
  name: string;
  tag: string;
  displayName: string;
  parameterCount: string;
  downloadStatus: FrontierDownloadStatus;
  requiredRamGb: number;
  recommendedRamGb: number;
  requiredDiskGb: number;
  recommendedGpuVramGb: number;
}

function makeEntry(over: Partial<FrontierEntryFixture> = {}): FrontierEntryFixture {
  return {
    id: 'm1',
    name: 'glm-5.1',
    tag: 'Q4_K_M',
    displayName: 'GLM-5.1',
    parameterCount: '754B',
    downloadStatus: FrontierDownloadStatus.AVAILABLE,
    requiredRamGb: 96,
    recommendedRamGb: 128,
    requiredDiskGb: 200,
    recommendedGpuVramGb: 24,
    ...over,
  };
}

describe('useLocalFrontierCatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useFrontierCatalogMock.mockReturnValue({
      data: { data: [makeEntry()], total: 1 },
      isLoading: false,
      isError: false,
    });
    useHardwareSnapshotMock.mockReturnValue({
      data: {
        totalRamGb: 256,
        freeRamGb: 200,
        totalDiskGb: 1000,
        freeDiskGb: 600,
        cpuCores: 16,
        platform: 'linux-x64-cuda12',
        gpus: [{ vendor: 'NVIDIA', model: 'RTX 4090', vramGb: 24, driver: '550' }],
        gpuBackend: 'CUDA',
        capturedAt: new Date().toISOString(),
      },
      isLoading: false,
    });
    useRuntimeInfoMock.mockReturnValue({ data: { binaryVersion: 'b8994' } });
    useLoadedModelMock.mockReturnValue({ data: null });
    usePullJobsMock.mockReturnValue({ data: { rows: [], total: 0 } });
    useInitiatePullMock.mockReturnValue({ mutate: mocks.initiate, isPending: false });
    useCancelPullMock.mockReturnValue({ mutate: mocks.cancel });
    useRetryPullMock.mockReturnValue({ mutate: mocks.retry });
    useRefreshCatalogMock.mockReturnValue({ mutate: mocks.refreshCatalog, isPending: false });
    useRefreshHardwareMock.mockReturnValue({ mutate: mocks.refreshHardware, isPending: false });
    useLoadModelMock.mockReturnValue({ mutate: mocks.load });
    useUnloadModelMock.mockReturnValue({ mutate: mocks.unload });
    useDeleteWeightsMock.mockReturnValue({ mutate: mocks.remove, isPending: false });
    useUpdateRuntimeConfigMock.mockReturnValue({ mutate: mocks.updateConfig, isPending: false });
    usePullProgressSseMock.mockReturnValue(null);
  });

  it('exposes catalog entries + computed compat per entry', () => {
    const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
      wrapper: makeWrapper(),
    });
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.compatByEntry.get('m1')?.chip).toBe(HardwareCompat.FITS);
  });

  describe('pull flow with hardware-gate override', () => {
    it('FITS → pulls immediately without opening override dialog', () => {
      const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      act(() => result.current.handlePullClick(result.current.entries[0]!));
      expect(mocks.initiate).toHaveBeenCalledWith({
        modelId: 'm1',
        overrideHardwareGate: false,
      });
      expect(result.current.overrideDialogOpen).toBe(false);
    });

    it('REFUSES → opens override dialog instead of pulling', () => {
      // Hardware too small → REFUSES
      useHardwareSnapshotMock.mockReturnValue({
        data: {
          totalRamGb: 256,
          freeRamGb: 600,
          totalDiskGb: 1000,
          freeDiskGb: 50,
          cpuCores: 16,
          platform: 'linux',
          gpus: [{ vendor: 'NVIDIA', model: 'RTX 4090', vramGb: 24, driver: '550' }],
          gpuBackend: 'CUDA',
          capturedAt: new Date().toISOString(),
        },
        isLoading: false,
      });
      const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      act(() => result.current.handlePullClick(result.current.entries[0]!));
      expect(mocks.initiate).not.toHaveBeenCalled();
      expect(result.current.overrideDialogOpen).toBe(true);
      expect(result.current.overrideEntry?.id).toBe('m1');
    });

    it('override confirm fires pull with overrideHardwareGate=true and closes dialog', () => {
      useHardwareSnapshotMock.mockReturnValue({
        data: {
          totalRamGb: 256,
          freeRamGb: 600,
          totalDiskGb: 1000,
          freeDiskGb: 50,
          cpuCores: 16,
          platform: 'linux',
          gpus: [{ vendor: 'NVIDIA', model: 'RTX 4090', vramGb: 24, driver: '550' }],
          gpuBackend: 'CUDA',
          capturedAt: new Date().toISOString(),
        },
        isLoading: false,
      });
      const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      act(() => result.current.handlePullClick(result.current.entries[0]!));
      act(() => result.current.handleOverrideConfirm());
      expect(mocks.initiate).toHaveBeenCalledWith({
        modelId: 'm1',
        overrideHardwareGate: true,
      });
      expect(result.current.overrideDialogOpen).toBe(false);
    });

    it('override cancel closes dialog without pulling', () => {
      useHardwareSnapshotMock.mockReturnValue({
        data: {
          totalRamGb: 256,
          freeRamGb: 600,
          totalDiskGb: 1000,
          freeDiskGb: 50,
          cpuCores: 16,
          platform: 'linux',
          gpus: [],
          gpuBackend: 'CUDA',
          capturedAt: new Date().toISOString(),
        },
        isLoading: false,
      });
      const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      act(() => result.current.handlePullClick(result.current.entries[0]!));
      expect(result.current.overrideDialogOpen).toBe(true);
      act(() => result.current.handleOverrideCancel());
      expect(mocks.initiate).not.toHaveBeenCalled();
      expect(result.current.overrideDialogOpen).toBe(false);
    });
  });

  describe('delete weights flow', () => {
    it('opens dialog, captures input, and confirm fires mutation with confirmName', () => {
      const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      act(() => result.current.handleDeleteClick(result.current.entries[0]!));
      expect(result.current.deleteDialogOpen).toBe(true);
      act(() => result.current.setDeleteInputValue('glm-5.1:Q4_K_M'));
      act(() => result.current.handleDeleteConfirm());
      expect(mocks.remove).toHaveBeenCalledWith(
        { modelId: 'm1', confirmName: 'glm-5.1:Q4_K_M' },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it('cancel resets dialog state', () => {
      const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      act(() => result.current.handleDeleteClick(result.current.entries[0]!));
      act(() => result.current.setDeleteInputValue('partial'));
      act(() => result.current.handleDeleteCancel());
      expect(result.current.deleteDialogOpen).toBe(false);
      expect(result.current.deleteInputValue).toBe('');
    });
  });

  describe('runtime config flow', () => {
    it('opens dialog with default draft and save fires mutation', () => {
      const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      act(() => result.current.handleConfigureClick(result.current.entries[0]!));
      expect(result.current.configDialogOpen).toBe(true);
      expect(result.current.configDraft.ctxSize).toBe(8192);

      act(() =>
        result.current.setConfigDraft({
          nGpuLayers: 50,
          ctxSize: 16384,
          cpuMoe: true,
          threads: 8,
          customArgs: '--mlock',
        }),
      );
      act(() => result.current.handleConfigureSave());
      expect(mocks.updateConfig).toHaveBeenCalledWith(
        {
          modelId: 'm1',
          payload: {
            nGpuLayers: 50,
            ctxSize: 16384,
            cpuMoe: true,
            threads: 8,
            customArgs: '--mlock',
          },
        },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it('cancel closes dialog without firing mutation', () => {
      const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      act(() => result.current.handleConfigureClick(result.current.entries[0]!));
      act(() => result.current.handleConfigureCancel());
      expect(result.current.configDialogOpen).toBe(false);
      expect(mocks.updateConfig).not.toHaveBeenCalled();
    });
  });

  describe('pull job actions', () => {
    it('handleCancel forwards jobId to cancel mutation', () => {
      const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      act(() => result.current.handleCancel('job-x'));
      expect(mocks.cancel).toHaveBeenCalledWith('job-x');
    });

    it('handleRetry forwards jobId to retry mutation', () => {
      const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      act(() => result.current.handleRetry('job-y'));
      expect(mocks.retry).toHaveBeenCalledWith('job-y');
    });

    it('refreshCatalog and refreshHardware fire their mutations', () => {
      const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      act(() => result.current.handleRefreshCatalog());
      act(() => result.current.handleRefreshHardware());
      expect(mocks.refreshCatalog).toHaveBeenCalled();
      expect(mocks.refreshHardware).toHaveBeenCalled();
    });
  });

  describe('load/unload', () => {
    it('handleUnloadCurrent only unloads when a model is currently loaded', () => {
      const { result, rerender } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      act(() => result.current.handleUnloadCurrent());
      expect(mocks.unload).not.toHaveBeenCalled();

      useLoadedModelMock.mockReturnValue({
        data: {
          id: 'm1',
          name: 'glm-5.1',
          tag: 'Q4_K_M',
          loadStatus: 'READY',
          port: 48500,
          pid: 100,
        },
      });
      rerender();
      act(() => result.current.handleUnloadCurrent());
      expect(mocks.unload).toHaveBeenCalledWith('m1');
    });
  });

  describe('downloadViews', () => {
    it('attaches live SSE progress to the active job only', () => {
      usePullJobsMock.mockReturnValue({
        data: {
          rows: [
            {
              id: 'j1',
              modelId: 'm1',
              status: 'RUNNING',
              downloadedBytes: 100,
              totalBytes: 200,
              completedFiles: 0,
              totalFiles: 1,
            },
            {
              id: 'j2',
              modelId: 'm1',
              status: 'COMPLETED',
              downloadedBytes: 200,
              totalBytes: 200,
              completedFiles: 1,
              totalFiles: 1,
            },
          ],
          total: 2,
        },
      });
      usePullProgressSseMock.mockReturnValue({
        jobId: 'j1',
        status: 'RUNNING',
        bytesDownloaded: 150,
        totalBytes: 200,
        completedFiles: 0,
        totalFiles: 1,
        currentFile: 'shard.gguf',
        mbps: 10,
        etaSeconds: 5,
        reasonCode: null,
        errorMessage: null,
      });
      const { result } = renderHook(() => useLocalFrontierCatalogPage(), {
        wrapper: makeWrapper(),
      });
      const views = result.current.downloadViews;
      expect(views).toHaveLength(2);
      expect(views[0]?.progress?.bytesDownloaded).toBe(150);
      expect(views[1]?.progress).toBeNull();
    });
  });
});
