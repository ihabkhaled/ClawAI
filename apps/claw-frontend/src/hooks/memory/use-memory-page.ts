import { useState } from "react";

import { MemoryType } from "@/enums";
import type { CreateMemoryRequest, MemoryRecord } from "@/types";

import { useCreateMemory } from "./use-create-memory";
import { useDeleteMemory } from "./use-delete-memory";
import { useMemories } from "./use-memories";
import { useToggleMemory } from "./use-toggle-memory";
import { useUpdateMemory } from "./use-update-memory";

type FilterType = MemoryType | "ALL";

export function useMemoryPage() {
  const [filterType, setFilterType] = useState<FilterType>("ALL");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryRecord | null>(
    null,
  );

  const filters: Record<string, unknown> =
    filterType !== "ALL" ? { type: filterType } : {};

  const { memories, isLoading, isError, error } = useMemories(filters);
  const { createMemory, isPending: isCreatePending } = useCreateMemory();
  const { updateMemory, isPending: isUpdatePending } = useUpdateMemory();
  const { deleteMemory, isPending: isDeletePending } = useDeleteMemory();
  const { toggleMemory, isPending: isTogglePending } = useToggleMemory();

  const handleOpenCreate = () => {
    setEditingMemory(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (memory: MemoryRecord) => {
    setEditingMemory(memory);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: CreateMemoryRequest) => {
    if (editingMemory) {
      updateMemory(
        { id: editingMemory.id, data },
        { onSuccess: () => setIsFormOpen(false) },
      );
    } else {
      createMemory(data, { onSuccess: () => setIsFormOpen(false) });
    }
  };

  const handleToggle = (id: string, isEnabled: boolean) => {
    toggleMemory({ id, isEnabled });
  };

  const handleDelete = (id: string) => {
    deleteMemory(id);
  };

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
