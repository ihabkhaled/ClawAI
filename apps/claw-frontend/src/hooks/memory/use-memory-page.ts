import { useCallback, useMemo, useState } from 'react';

import { MemoryFilterValue } from '@/enums';
import type { CreateMemoryRequest, MemoryFilterType, MemoryRecord } from '@/types';

import { useCreateMemory } from './use-create-memory';
import { useDeleteMemory } from './use-delete-memory';
import { useMemories } from './use-memories';
import { useToggleMemory } from './use-toggle-memory';
import { useUpdateMemory } from './use-update-memory';

export function useMemoryPage() {
  const [filterType, setFilterType] = useState<MemoryFilterType>(MemoryFilterValue.ALL);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryRecord | null>(null);

  const filters = useMemo<Record<string, unknown>>(
    () => (filterType !== MemoryFilterValue.ALL ? { type: filterType } : {}),
    [filterType],
  );

  const { memories, isLoading, isError, error } = useMemories(filters);
  const { createMemory, isPending: isCreatePending } = useCreateMemory();
  const { updateMemory, isPending: isUpdatePending } = useUpdateMemory();
  const { deleteMemory, isPending: isDeletePending } = useDeleteMemory();
  const { toggleMemory, isPending: isTogglePending } = useToggleMemory();

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

  return {
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
    isFormPending: isCreatePending || isUpdatePending,
    isDeletePending,
    isTogglePending,
  };
}
