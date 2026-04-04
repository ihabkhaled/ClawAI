import { useState } from "react";

import type {
  CreateContextPackRequest,
  CreateContextPackItemRequest,
} from "@/types";

import { useContextPackDetail } from "./use-context-pack-detail";
import { useContextPacks } from "./use-context-packs";
import { useCreateContextPack } from "./use-create-context-pack";

export function useContextPage() {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [isAddItemFormOpen, setIsAddItemFormOpen] = useState(false);

  const { contextPacks, isLoading, isError, error } = useContextPacks();
  const { createContextPack, isPending: isCreatePending } =
    useCreateContextPack();

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

  const handleCreatePack = (data: CreateContextPackRequest) => {
    createContextPack(data, {
      onSuccess: () => setIsCreateFormOpen(false),
    });
  };

  const handleDeletePack = () => {
    deleteContextPack(undefined, {
      onSuccess: () => setSelectedPackId(null),
    });
  };

  const handleAddItem = (data: CreateContextPackItemRequest) => {
    addItem(data, {
      onSuccess: () => setIsAddItemFormOpen(false),
    });
  };

  const handleReorderItem = (itemId: string, newSortOrder: number) => {
    updateItem({ itemId, data: { sortOrder: newSortOrder } });
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
  };

  return {
    contextPacks,
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
  };
}
