'use client';

import { BookOpen, ChevronRight, Home, Plus, Search, Trash2 } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { ContextPackForm } from '@/components/context-packs/context-pack-form';
import { ContextPackItemForm } from '@/components/context-packs/context-pack-item-form';
import { ContextPackItemList } from '@/components/context-packs/context-pack-item-list';
import { ContextPackListGrid } from '@/components/context-packs/context-pack-list-grid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContextPage } from '@/hooks/context-packs/use-context-page';
import { useMediaQuery } from '@/hooks/ui/use-media-query';
import { useTranslation } from '@/lib/i18n';

export default function ContextPage() {
  const {
    contextPacks,
    filteredContextPacks,
    isLoading,
    isError,
    error,
    isCreateFormOpen,
    setIsCreateFormOpen,
    handleCreatePack,
    isCreatePending,
    selectedPackId,
    setSelectedPackId,
    selectedPack,
    filteredPackItems,
    isDetailLoading,
    handleDeletePack,
    isDeletePending,
    isAddItemFormOpen,
    setIsAddItemFormOpen,
    handleAddItem,
    isAddItemPending,
    handleReorderItem,
    isUpdateItemPending,
    handleRemoveItem,
    isRemoveItemPending,
    searchQuery,
    setSearchQuery,
  } = useContextPage();

  const { t } = useTranslation();
  // Drag-and-drop only on md+ to honor the spec (touch reorder uses ↑/↓ buttons).
  const isDragSupported = useMediaQuery('(min-width: 768px)');

  if (isError) {
    return (
      <div>
        <PageHeader title={t('context.title')} description={t('context.description')} />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-destructive">{error?.message ?? t('context.loadFailed')}</p>
        </div>
      </div>
    );
  }

  if (selectedPackId) {
    return (
      <div>
        <nav
          aria-label="Breadcrumb"
          className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <button
            type="button"
            onClick={() => setSelectedPackId(null)}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('context.title')}</span>
          </button>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          <span className="truncate font-medium text-foreground">
            {selectedPack?.name ?? t('context.contextPack')}
          </span>
        </nav>

        <PageHeader
          title={selectedPack?.name ?? t('context.contextPack')}
          description={selectedPack?.description ?? t('context.packDetailsDesc')}
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsAddItemFormOpen(true)}>
                <Plus className="me-2 h-4 w-4" />
                {t('context.addItem')}
              </Button>
              <Button variant="destructive" onClick={handleDeletePack} disabled={isDeletePending}>
                <Trash2 className="me-2 h-4 w-4" />
                {isDeletePending ? t('context.deleting') : t('context.deletePack')}
              </Button>
            </div>
          }
        />

        <div className="relative mb-4">
          <Search
            className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search')}
            className="ps-9"
            aria-label={t('common.search')}
          />
        </div>

        {isDetailLoading && <LoadingSpinner label={t('context.loadingPackDetails')} />}

        {!isDetailLoading && filteredPackItems.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title={searchQuery ? t('common.noResults') : t('context.noItems')}
            description={searchQuery ? '' : t('context.noItemsDesc')}
            action={
              !searchQuery ? (
                <Button onClick={() => setIsAddItemFormOpen(true)}>
                  <Plus className="me-2 h-4 w-4" />
                  {t('context.addItem')}
                </Button>
              ) : undefined
            }
          />
        )}

        {!isDetailLoading && filteredPackItems.length > 0 && (
          <ContextPackItemList
            items={filteredPackItems}
            isDragSupported={isDragSupported}
            onReorder={handleReorderItem}
            onRemove={handleRemoveItem}
            isUpdatePending={isUpdateItemPending}
            isRemovePending={isRemoveItemPending}
          />
        )}

        <ContextPackItemForm
          open={isAddItemFormOpen}
          onOpenChange={setIsAddItemFormOpen}
          onSubmit={handleAddItem}
          isPending={isAddItemPending}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('context.title')}
        description={t('context.description')}
        actions={
          <Button onClick={() => setIsCreateFormOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t('context.createPack')}
          </Button>
        }
      />

      {contextPacks.length > 0 ? (
        <div className="relative mb-4">
          <Search
            className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search')}
            className="ps-9 sm:max-w-md"
            aria-label={t('common.search')}
          />
        </div>
      ) : null}

      {isLoading && <LoadingSpinner label={t('context.loadingContextPacks')} />}

      {!isLoading && contextPacks.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title={t('context.noContextPacks')}
          description={t('context.noContextPacksDesc')}
          action={
            <Button onClick={() => setIsCreateFormOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              {t('context.createPack')}
            </Button>
          }
        />
      )}

      {!isLoading && contextPacks.length > 0 && filteredContextPacks.length === 0 && (
        <EmptyState icon={Search} title={t('common.noResults')} description="" />
      )}

      {!isLoading && filteredContextPacks.length > 0 && (
        <ContextPackListGrid packs={filteredContextPacks} onSelectPack={setSelectedPackId} />
      )}

      <ContextPackForm
        open={isCreateFormOpen}
        onOpenChange={setIsCreateFormOpen}
        onSubmit={handleCreatePack}
        isPending={isCreatePending}
      />
    </div>
  );
}
