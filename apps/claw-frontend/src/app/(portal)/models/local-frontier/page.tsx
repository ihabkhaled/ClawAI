'use client';

import { Cpu, Sparkles } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { CatalogGrid } from '@/components/local-frontier/catalog-grid';
import { DeleteWeightsDialog } from '@/components/local-frontier/delete-weights-dialog';
import { DownloadsDrawer } from '@/components/local-frontier/downloads-drawer';
import { FilterBar } from '@/components/local-frontier/filter-bar';
import { HardwarePanel } from '@/components/local-frontier/hardware-panel';
import { HfSearchDialog } from '@/components/local-frontier/hf-search-dialog';
import { OverridePromptDialog } from '@/components/local-frontier/override-prompt-dialog';
import { RuntimeConfigDialog } from '@/components/local-frontier/runtime-config-dialog';
import { Button } from '@/components/ui/button';
import { useLocalFrontierCatalogPage } from '@/hooks/local-frontier/use-local-frontier-catalog-page';

export default function LocalFrontierCatalogPage(): React.ReactElement {
  const ctrl = useLocalFrontierCatalogPage();
  const { t } = ctrl;

  const cardLabels = {
    download: t('localFrontier.actions.download'),
    load: t('localFrontier.actions.load'),
    unload: t('localFrontier.actions.unload'),
    activate: t('localFrontier.actions.activate'),
    activateHint: t('localFrontier.actions.activateHint'),
    deactivate: t('localFrontier.actions.deactivate'),
    deactivateHint: t('localFrontier.actions.deactivateHint'),
    loading: t('localFrontier.actions.loading'),
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
    requiresVramGb: t('localFrontier.requiresVramGb'),
    activeBadge: t('localFrontier.status.active'),
    activeBadgeHint: t('localFrontier.status.activeHint'),
    idleBadge: t('localFrontier.status.idle'),
    idleBadgeHint: t('localFrontier.status.idleHint'),
    loadingBadge: t('localFrontier.status.loading'),
    crashedBadge: t('localFrontier.status.crashed'),
    crashedBadgeHint: t('localFrontier.status.crashedHint'),
    notActiveHelp: t('localFrontier.status.notActiveHelp'),
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
    activeModel: t('localFrontier.hardware.activeModel'),
    noActiveModel: t('localFrontier.hardware.noActiveModel'),
    noLoadedModelDescription: t('localFrontier.hardware.noLoadedModelDescription'),
    deactivate: t('localFrontier.actions.deactivate'),
    deactivateHint: t('localFrontier.actions.deactivateHint'),
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
    searchLabel: t('localFrontier.filters.searchLabel'),
    searchPlaceholder: t('localFrontier.filters.searchPlaceholder'),
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
    elapsed: t('localFrontier.downloads.elapsed'),
    percent: t('localFrontier.downloads.percent'),
    preparing: t('localFrontier.downloads.preparing'),
    installing: t('localFrontier.downloads.installing'),
    installingStepLabel: t('localFrontier.downloads.installingStep'),
    retryingLabel: t('localFrontier.downloads.retrying'),
    resumedLabel: t('localFrontier.downloads.resumed'),
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
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('localFrontier.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('localFrontier.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={ctrl.openHfDialog} className="gap-1.5">
          <Sparkles className="size-4" aria-hidden />
          {t('localFrontier.hfSearch.openButton')}
        </Button>
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
        searchInput={ctrl.searchInput}
        isRefreshing={ctrl.isRefreshingCatalog}
        onCategoryChange={ctrl.setCategory}
        onQualityTierChange={ctrl.setQualityTier}
        onCompatibleOnlyChange={ctrl.setCompatibleOnly}
        onSearchChange={ctrl.setSearchInput}
        onRefreshCatalog={ctrl.handleRefreshCatalog}
        labels={filterLabels}
      />

      {!ctrl.isLoading && !ctrl.isError ? (
        <p className="px-1 text-xs text-muted-foreground">
          {t('localFrontier.filters.resultsCount', {
            count: ctrl.entries.length,
            total: ctrl.total,
          })}
        </p>
      ) : null}

      <DownloadsDrawer
        views={ctrl.downloadViews}
        onCancel={ctrl.handleCancel}
        onRetry={ctrl.handleRetry}
        labels={drawerLabels}
      />

      {ctrl.isLoading && <LoadingState rows={3} label={t('localFrontier.loading')} />}
      {!ctrl.isLoading && ctrl.isError && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {t('localFrontier.catalogError')}
        </p>
      )}
      {!ctrl.isLoading && !ctrl.isError && ctrl.entries.length === 0 && (
        <EmptyState icon={Cpu} title={t('localFrontier.catalogEmpty')} />
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

      <HfSearchDialog open={ctrl.hfDialogOpen} onOpenChange={ctrl.setHfDialogOpen} />
    </div>
  );
}
