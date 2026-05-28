import { useCallback, useMemo, useState } from 'react';

import { MemoryFilterValue, MemorySuggestionStatus, MemoryTab } from '@/enums';
import type {
  ApproveSuggestionRequest,
  CreateMemoryRequest,
  MemoryFilterType,
  MemoryRecord,
  RejectSuggestionRequest,
} from '@/types';

import { useApproveMemorySuggestion } from './use-approve-memory-suggestion';
import { useCreateMemory } from './use-create-memory';
import { useDeleteMemory } from './use-delete-memory';
import { useMemories } from './use-memories';
import { useMemoryAuditAll } from './use-memory-audit';
import { useMemoryPreferences } from './use-memory-preferences';
import { useMemorySuggestions } from './use-memory-suggestions';
import { useRejectMemorySuggestion } from './use-reject-memory-suggestion';
import { useToggleMemory } from './use-toggle-memory';
import { useUpdateMemory } from './use-update-memory';

export function useMemoryPage() {
  const [activeTab, setActiveTab] = useState<MemoryTab>(MemoryTab.SAVED);
  const [filterType, setFilterType] = useState<MemoryFilterType>(MemoryFilterValue.ALL);
  const [filterScope, setFilterScope] = useState<string>(MemoryFilterValue.ALL);
  const [filterSource, setFilterSource] = useState<string>(MemoryFilterValue.ALL);
  const [filterSensitivity, setFilterSensitivity] = useState<string>(MemoryFilterValue.ALL);
  const [search, setSearch] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryRecord | null>(null);

  const filters = useMemo<Record<string, unknown>>(() => {
    const f: Record<string, unknown> = {};
    if (filterType !== MemoryFilterValue.ALL) {
      f['type'] = filterType;
    }
    if (filterScope !== MemoryFilterValue.ALL) {
      f['scope'] = filterScope;
    }
    if (filterSource !== MemoryFilterValue.ALL) {
      f['source'] = filterSource;
    }
    if (filterSensitivity !== MemoryFilterValue.ALL) {
      f['sensitivity'] = filterSensitivity;
    }
    if (search.trim().length > 0) {
      f['search'] = search.trim();
    }
    return f;
  }, [filterType, filterScope, filterSource, filterSensitivity, search]);

  const { memories, isLoading, isError, error } = useMemories(filters);
  const { suggestions, isLoading: isSuggestionsLoading } = useMemorySuggestions({
    status: MemorySuggestionStatus.PENDING,
  });
  const { entries: auditEntries, isLoading: isAuditLoading } = useMemoryAuditAll(100);
  const { preferences } = useMemoryPreferences();
  const { createMemory, isPending: isCreatePending } = useCreateMemory();
  const { updateMemory, isPending: isUpdatePending } = useUpdateMemory();
  const { deleteMemory, isPending: isDeletePending } = useDeleteMemory();
  const { toggleMemory, isPending: isTogglePending } = useToggleMemory();
  const approveSuggestion = useApproveMemorySuggestion();
  const rejectSuggestion = useRejectMemorySuggestion();

  const handleOpenCreate = useCallback(() => {
    setEditingMemory(null);
    setIsFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((memory: MemoryRecord) => {
    setEditingMemory(memory);
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    (data: CreateMemoryRequest) => {
      if (editingMemory) {
        updateMemory({ id: editingMemory.id, data }, { onSuccess: () => setIsFormOpen(false) });
      } else {
        createMemory(data, { onSuccess: () => setIsFormOpen(false) });
      }
    },
    [editingMemory, updateMemory, createMemory],
  );

  const handleToggle = useCallback(
    (id: string) => {
      toggleMemory({ id });
    },
    [toggleMemory],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMemory(id);
    },
    [deleteMemory],
  );

  const handleApproveSuggestion = useCallback(
    (id: string, data: ApproveSuggestionRequest = {}) => {
      approveSuggestion.mutate({ id, data });
    },
    [approveSuggestion],
  );

  const handleRejectSuggestion = useCallback(
    (id: string, data: RejectSuggestionRequest = {}) => {
      rejectSuggestion.mutate({ id, data });
    },
    [rejectSuggestion],
  );

  return {
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
    preferences,
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
    isFormPending: isCreatePending || isUpdatePending,
    isDeletePending,
    isTogglePending,
    isApprovingSuggestion: approveSuggestion.isPending,
    isRejectingSuggestion: rejectSuggestion.isPending,
  };
}
