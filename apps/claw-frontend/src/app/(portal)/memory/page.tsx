'use client';

import { Brain, Plus } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { MemoryCard } from '@/components/memory/memory-card';
import { MemoryForm } from '@/components/memory/memory-form';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MEMORY_FILTER_OPTIONS } from '@/constants';
import { useMemoryPage } from '@/hooks/memory/use-memory-page';
import { useTranslation } from '@/lib/i18n';
import type { MemoryFilterType } from '@/types';

export default function MemoryPage() {
  const {
    memories,
    isLoading,
    isError,
    error,
    filterType,
    setFilterType,
    isFormOpen,
    setIsFormOpen,
    editingMemory,
    handleOpenCreate,
    handleOpenEdit,
    handleFormSubmit,
    handleToggle,
    handleDelete,
    isFormPending,
    isTogglePending,
  } = useMemoryPage();

  const { t } = useTranslation();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title={t('memory.title')}
          description={t('memory.description')}
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error?.message ?? t('memory.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('memory.title')}
        description={t('memory.description')}
        actions={
          <div className="flex items-center gap-3">
            <Select
              value={filterType}
              onValueChange={(value) => setFilterType(value as MemoryFilterType)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEMORY_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleOpenCreate}>
              <Plus className="me-2 h-4 w-4" />
              {t('memory.addMemory')}
            </Button>
          </div>
        }
      />

      {isLoading && <LoadingSpinner label={t('memory.loadingMemories')} />}

      {!isLoading && memories.length === 0 && (
        <EmptyState
          icon={Brain}
          title={t('memory.noMemories')}
          description={t('memory.noMemoriesDesc')}
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="me-2 h-4 w-4" />
              {t('memory.addMemory')}
            </Button>
          }
        />
      )}

      {!isLoading && memories.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onToggle={handleToggle}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              isTogglePending={isTogglePending}
            />
          ))}
        </div>
      )}

      <MemoryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        isPending={isFormPending}
        memory={editingMemory}
      />
    </div>
  );
}
