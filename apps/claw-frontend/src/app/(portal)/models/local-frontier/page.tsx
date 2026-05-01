'use client';

import { Cpu, Loader2 } from 'lucide-react';

import { CatalogGrid } from '@/components/local-frontier/catalog-grid';
import { DeleteWeightsDialog } from '@/components/local-frontier/delete-weights-dialog';
import { DownloadsDrawer } from '@/components/local-frontier/downloads-drawer';
import { FilterBar } from '@/components/local-frontier/filter-bar';
import { HardwarePanel } from '@/components/local-frontier/hardware-panel';
import { OverridePromptDialog } from '@/components/local-frontier/override-prompt-dialog';
import { RuntimeConfigDialog } from '@/components/local-frontier/runtime-config-dialog';
import { useLocalFrontierCatalogPage } from '@/hooks/local-frontier/use-local-frontier-catalog-page';

export default function LocalFrontierCatalogPage(): React.ReactElement {
  const ctrl = useLocalFrontierCatalogPage();
  const { t } = ctrl;

  const cardLabels = {
    download: t('localFrontier.actions.download'),
    load: t('localFrontier.actions.load'),
    unload: t('localFrontier.actions.unload'),
    deleteWeights: t('localFrontier.actions.deleteWeights'),
    configure: t('localFrontier.actions.configure'),
    fits: t('localFrontier.compat.fits'),
    warns: t('localFrontier.compat.warns'),
    refuses: t('localFrontier.compat.refuses'),
    survival: t('localFrontier.qualityTier.survival'),
    balanced: t('localFrontier.qualityTier.balanced'),
    best: t('localFrontier.qualityTier.best'),
    sourceLink: t('localFrontier.sourceLink'),
    contextLength: t('localFrontier.contextLength'),
    requiresRamGb: t('localFrontier.requiresRamGb'),
  };

  const hardwareLabels = {
    title: t('localFrontier.hardware.title'),
    subtitle: t('localFrontier.hardware.subtitle'),
    refresh: t('localFrontier.hardware.refresh'),
    ram: t('localFrontier.hardware.ram'),
    disk: t('localFrontier.hardware.disk'),
    cpu: t('localFrontier.hardware.cpu'),
    gpu: t('localFrontier.hardware.gpu'),
    binary: t('localFrontier.hardware.binary'),
    cores: t('localFrontier.hardware.cores'),
    noGpu: t('localFrontier.hardware.noGpu'),
    notInstalled: t('localFrontier.hardware.notInstalled'),
    loadedModel: t('localFrontier.hardware.loadedModel'),
    noLoadedModel: t('localFrontier.hardware.noLoadedModel'),
    unload: t('localFrontier.actions.unload'),
  };

  const filterLabels = {
    category: t('localFrontier.filters.category'),
    qualityTier: t('localFrontier.filters.qualityTier'),
    compatibleOnly: t('localFrontier.filters.compatibleOnly'),
    refreshCatalog: t('localFrontier.filters.refreshCatalog'),
    refreshing: t('localFrontier.filters.refreshing'),
    allCategories: t('localFrontier.filters.allCategories'),
    allTiers: t('localFrontier.filters.allTiers'),
    categoryCoding: t('localFrontier.filters.categoryCoding'),
    categoryReasoning: t('localFrontier.filters.categoryReasoning'),
    categoryThinking: t('localFrontier.filters.categoryThinking'),
    categoryGeneral: t('localFrontier.filters.categoryGeneral'),
    categoryFileGen: t('localFrontier.filters.categoryFileGen'),
    tierSurvival: t('localFrontier.qualityTier.survival'),
    tierBalanced: t('localFrontier.qualityTier.balanced'),
    tierBest: t('localFrontier.qualityTier.best'),
  };

  const drawerLabels = {
    title: t('localFrontier.downloads.title'),
    empty: t('localFrontier.downloads.empty'),
    cancel: t('localFrontier.downloads.cancel'),
    retry: t('localFrontier.downloads.retry'),
    remove: t('localFrontier.downloads.remove'),
    status: t('localFrontier.downloads.status'),
    bytes: t('localFrontier.downloads.bytes'),
    files: t('localFrontier.downloads.files'),
    rate: t('localFrontier.downloads.rate'),
    eta: t('localFrontier.downloads.eta'),
    unknown: t('localFrontier.downloads.unknown'),
  };

  const deleteLabels = {
    title: t('localFrontier.deleteDialog.title'),
    description: t('localFrontier.deleteDialog.description'),
    promptLabel: t('localFrontier.deleteDialog.promptLabel'),
    placeholder: t('localFrontier.deleteDialog.placeholder'),
    cancel: t('localFrontier.deleteDialog.cancel'),
    confirm: t('localFrontier.deleteDialog.confirm'),
    warning: t('localFrontier.deleteDialog.warning'),
  };

  const overrideLabels = {
    title: t('localFrontier.overrideDialog.title'),
    description: t('localFrontier.overrideDialog.description'),
    reasonsTitle: t('localFrontier.overrideDialog.reasonsTitle'),
    cancel: t('localFrontier.overrideDialog.cancel'),
    proceed: t('localFrontier.overrideDialog.proceed'),
  };

  const configLabels = {
    title: t('localFrontier.configDialog.title'),
    description: t('localFrontier.configDialog.description'),
    ngpuLayers: t('localFrontier.configDialog.ngpuLayers'),
    ngpuLayersHint: t('localFrontier.configDialog.ngpuLayersHint'),
    ctxSize: t('localFrontier.configDialog.ctxSize'),
    ctxSizeHint: t('localFrontier.configDialog.ctxSizeHint'),
    threads: t('localFrontier.configDialog.threads'),
    threadsHint: t('localFrontier.configDialog.threadsHint'),
    cpuMoe: t('localFrontier.configDialog.cpuMoe'),
    cpuMoeHint: t('localFrontier.configDialog.cpuMoeHint'),
    customArgs: t('localFrontier.configDialog.customArgs'),
    customArgsHint: t('localFrontier.configDialog.customArgsHint'),
    cancel: t('localFrontier.configDialog.cancel'),
    save: t('localFrontier.configDialog.save'),
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <header>
        <h1 className="text-2xl font-bold text-foreground">{t('localFrontier.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('localFrontier.subtitle')}</p>
      </header>

      <HardwarePanel
        hardware={ctrl.hardware}
        runtime={ctrl.runtime}
        loaded={ctrl.loaded}
        isRefreshing={ctrl.isRefreshingHardware}
        onRefresh={ctrl.handleRefreshHardware}
        onUnloadCurrent={ctrl.handleUnloadCurrent}
        labels={hardwareLabels}
      />

      <FilterBar
        category={ctrl.category}
        qualityTier={ctrl.qualityTier}
        compatibleOnly={ctrl.compatibleOnly}
        isRefreshing={ctrl.isRefreshingCatalog}
        onCategoryChange={ctrl.setCategory}
        onQualityTierChange={ctrl.setQualityTier}
        onCompatibleOnlyChange={ctrl.setCompatibleOnly}
        onRefreshCatalog={ctrl.handleRefreshCatalog}
        labels={filterLabels}
      />

      <DownloadsDrawer
        views={ctrl.downloadViews}
        onCancel={ctrl.handleCancel}
        onRetry={ctrl.handleRetry}
        labels={drawerLabels}
      />

      {ctrl.isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
          <span className="ml-2 text-sm text-muted-foreground">{t('localFrontier.loading')}</span>
        </div>
      )}
      {!ctrl.isLoading && ctrl.isError && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {t('localFrontier.catalogError')}
        </p>
      )}
      {!ctrl.isLoading && !ctrl.isError && ctrl.entries.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <Cpu className="size-8" aria-hidden />
          <p className="text-sm">{t('localFrontier.catalogEmpty')}</p>
        </div>
      )}
      {!ctrl.isLoading && !ctrl.isError && ctrl.entries.length > 0 && (
        <CatalogGrid
          entries={ctrl.entries}
          compatByEntry={ctrl.compatByEntry}
          onPullClick={ctrl.handlePullClick}
          onLoadClick={ctrl.handleLoad}
          onUnloadClick={ctrl.handleUnload}
          onDeleteClick={ctrl.handleDeleteClick}
          onConfigureClick={ctrl.handleConfigureClick}
          isPullPending={ctrl.isPullPending}
          labels={cardLabels}
        />
      )}

      <DeleteWeightsDialog
        open={ctrl.deleteDialogOpen}
        entry={ctrl.deleteEntry}
        inputValue={ctrl.deleteInputValue}
        isPending={ctrl.isDeleting}
        onInputChange={ctrl.setDeleteInputValue}
        onCancel={ctrl.handleDeleteCancel}
        onConfirm={ctrl.handleDeleteConfirm}
        labels={deleteLabels}
      />

      <OverridePromptDialog
        open={ctrl.overrideDialogOpen}
        entry={ctrl.overrideEntry}
        compat={ctrl.overrideCompat}
        isPending={ctrl.isPullPending}
        onCancel={ctrl.handleOverrideCancel}
        onConfirm={ctrl.handleOverrideConfirm}
        labels={overrideLabels}
      />

      <RuntimeConfigDialog
        open={ctrl.configDialogOpen}
        loaded={ctrl.loaded}
        draft={ctrl.configDraft}
        isPending={ctrl.isUpdatingConfig}
        onChange={ctrl.setConfigDraft}
        onCancel={ctrl.handleConfigureCancel}
        onSave={ctrl.handleConfigureSave}
        labels={configLabels}
      />
    </div>
  );
}
