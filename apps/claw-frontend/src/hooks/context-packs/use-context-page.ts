import { useCallback, useMemo, useState } from 'react';

import type { CreateContextPackRequest, CreateContextPackItemRequest } from '@/types';

import { useContextPackDetail } from './use-context-pack-detail';
import { useContextPacks } from './use-context-packs';
import { useCreateContextPack } from './use-create-context-pack';

export function useContextPage() {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [isAddItemFormOpen, setIsAddItemFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { contextPacks, isLoading, isError, error } = useContextPacks();
  const { createContextPack, isPending: isCreatePending } = useCreateContextPack();

  const {
    contextPack: selectedPack,
    isLoading: isDetailLoading,
    updateContextPack,
    isUpdatePending,
    deleteContextPack,
    isDeletePending,
    addItem,
    isAddItemPending,
    updateItem,
    isUpdateItemPending,
    removeItem,
    isRemoveItemPending,
  } = useContextPackDetail(selectedPackId);

  const handleCreatePack = useCallback(
    (data: CreateContextPackRequest) => {
      createContextPack(data, {
        onSuccess: () => setIsCreateFormOpen(false),
      });
    },
    [createContextPack],
  );

  const handleDeletePack = useCallback(() => {
    deleteContextPack(undefined, {
      onSuccess: () => setSelectedPackId(null),
    });
  }, [deleteContextPack]);

  const handleAddItem = useCallback(
    (data: CreateContextPackItemRequest) => {
      addItem(data, {
        onSuccess: () => setIsAddItemFormOpen(false),
      });
    },
    [addItem],
  );

  const handleReorderItem = useCallback(
    (itemId: string, newSortOrder: number) => {
      updateItem({ itemId, data: { sortOrder: newSortOrder } });
    },
    [updateItem],
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      removeItem(itemId);
    },
    [removeItem],
  );

  // Filter the list view when a search query is active.
  // The detail view filters items separately below.
  const filteredContextPacks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return contextPacks;
    }
    return contextPacks.filter((pack) => {
      const name = pack.name?.toLowerCase() ?? '';
      const description = pack.description?.toLowerCase() ?? '';
      const scope = pack.scope?.toLowerCase() ?? '';
      return name.includes(q) || description.includes(q) || scope.includes(q);
    });
  }, [contextPacks, searchQuery]);

  const filteredPackItems = useMemo(() => {
    if (!selectedPack) {
      return [];
    }
    const sorted = [...selectedPack.items].sort((a, b) => a.sortOrder - b.sortOrder);
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return sorted;
    }
    return sorted.filter((item) => {
      const content = item.content?.toLowerCase() ?? '';
      const fileId = item.fileId?.toLowerCase() ?? '';
      const type = item.type?.toLowerCase() ?? '';
      return content.includes(q) || fileId.includes(q) || type.includes(q);
    });
  }, [selectedPack, searchQuery]);

  return {
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
    updateContextPack,
    isUpdatePending,
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
  };
}
