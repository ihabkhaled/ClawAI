'use client';

import { Brain, Plus } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { AuditList } from '@/components/memory/audit-list';
import { MemoryCard } from '@/components/memory/memory-card';
import { MemoryForm } from '@/components/memory/memory-form';
import { SuggestionsList } from '@/components/memory/suggestions-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MEMORY_FILTER_OPTIONS } from '@/constants';
import { MemoryScope, MemorySensitivity, MemorySource, MemoryTab } from '@/enums';
import { useMemoryPage } from '@/hooks/memory/use-memory-page';
import { useTranslation } from '@/lib/i18n';
import type { MemoryFilterType } from '@/types';

export default function MemoryPage(): React.ReactElement {
  const {
    activeTab,
    setActiveTab,
    memories,
    isLoading,
    isError,
    error,
    suggestions,
    isSuggestionsLoading,
    auditEntries,
    isAuditLoading,
    filterType,
    setFilterType,
    filterScope,
    setFilterScope,
    filterSource,
    setFilterSource,
    filterSensitivity,
    setFilterSensitivity,
    search,
    setSearch,
    isFormOpen,
    setIsFormOpen,
    editingMemory,
    handleOpenCreate,
    handleOpenEdit,
    handleFormSubmit,
    handleToggle,
    handleDelete,
    handleApproveSuggestion,
    handleRejectSuggestion,
    isFormPending,
    isTogglePending,
    isApprovingSuggestion,
    isRejectingSuggestion,
  } = useMemoryPage();

  const { t } = useTranslation();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t('memory.title')} description={t('memory.description')} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">{error?.message ?? t('memory.loadFailed')}</p>
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
          <Button onClick={handleOpenCreate}>
            <Plus className="me-2 h-4 w-4" />
            {t('memory.addMemory')}
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as MemoryTab)}
        className="flex flex-1 flex-col gap-4"
      >
        <TabsList className="self-start">
          <TabsTrigger value={MemoryTab.SAVED}>{t('memory.tabSaved')}</TabsTrigger>
          <TabsTrigger value={MemoryTab.SUGGESTIONS} className="gap-2">
            {t('memory.tabSuggestions')}
            {suggestions.length > 0 ? (
              <Badge variant="secondary" className="text-xs">
                {suggestions.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value={MemoryTab.AUDIT}>{t('memory.tabAudit')}</TabsTrigger>
        </TabsList>

        <TabsContent value={MemoryTab.SAVED} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder={t('memory.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[260px]"
            />
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
                    {t(opt.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterScope} onValueChange={setFilterScope}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('memory.filterAllScopes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('memory.filterAllScopes')}</SelectItem>
                <SelectItem value={MemoryScope.USER}>{t('memory.scopeUser')}</SelectItem>
                <SelectItem value={MemoryScope.THREAD}>{t('memory.scopeThread')}</SelectItem>
                <SelectItem value={MemoryScope.WORKSPACE}>{t('memory.scopeWorkspace')}</SelectItem>
                <SelectItem value={MemoryScope.PROJECT}>{t('memory.scopeProject')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('memory.filterAllSources')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('memory.filterAllSources')}</SelectItem>
                <SelectItem value={MemorySource.USER_MANUAL}>
                  {t('memory.sourceUserManual')}
                </SelectItem>
                <SelectItem value={MemorySource.AI_EXTRACTED}>
                  {t('memory.sourceAiExtracted')}
                </SelectItem>
                <SelectItem value={MemorySource.AUTOMATION_LEARNING}>
                  {t('memory.sourceAutomation')}
                </SelectItem>
                <SelectItem value={MemorySource.IMPORTED}>{t('memory.sourceImported')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSensitivity} onValueChange={setFilterSensitivity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('memory.filterAllSensitivities')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('memory.filterAllSensitivities')}</SelectItem>
                <SelectItem value={MemorySensitivity.NORMAL}>
                  {t('memory.sensitivityNormal')}
                </SelectItem>
                <SelectItem value={MemorySensitivity.SENSITIVE}>
                  {t('memory.sensitivitySensitive')}
                </SelectItem>
                <SelectItem value={MemorySensitivity.REDACTED}>
                  {t('memory.sensitivityRedacted')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

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
        </TabsContent>

        <TabsContent value={MemoryTab.SUGGESTIONS}>
          <SuggestionsList
            suggestions={suggestions}
            isLoading={isSuggestionsLoading}
            isPending={isApprovingSuggestion || isRejectingSuggestion}
            onApprove={handleApproveSuggestion}
            onReject={handleRejectSuggestion}
          />
        </TabsContent>

        <TabsContent value={MemoryTab.AUDIT}>
          <AuditList entries={auditEntries} isLoading={isAuditLoading} />
        </TabsContent>
      </Tabs>

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
