import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { contextPacksRepository } from "@/repositories/context-packs/context-packs.repository";
import { queryKeys } from "@/repositories/shared/query-keys";
import type {
  UpdateContextPackRequest,
  CreateContextPackItemRequest,
  UpdateContextPackItemRequest,
} from "@/types";

export function useContextPackDetail(id: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.contextPacks.detail(id ?? ""),
    queryFn: () => contextPacksRepository.getContextPack(id ?? ""),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateContextPackRequest) =>
      contextPacksRepository.updateContextPack(id ?? "", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.detail(id ?? ""),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.lists(),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => contextPacksRepository.deleteContextPack(id ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.lists(),
      });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (data: CreateContextPackItemRequest) =>
      contextPacksRepository.addItem(id ?? "", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.detail(id ?? ""),
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: string;
      data: UpdateContextPackItemRequest;
    }) => contextPacksRepository.updateItem(id ?? "", itemId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.detail(id ?? ""),
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      contextPacksRepository.removeItem(id ?? "", itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.detail(id ?? ""),
      });
    },
  });

  return {
    contextPack: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateContextPack: updateMutation.mutate,
    isUpdatePending: updateMutation.isPending,
    deleteContextPack: deleteMutation.mutate,
    isDeletePending: deleteMutation.isPending,
    addItem: addItemMutation.mutate,
    isAddItemPending: addItemMutation.isPending,
    updateItem: updateItemMutation.mutate,
    isUpdateItemPending: updateItemMutation.isPending,
    removeItem: removeItemMutation.mutate,
    isRemoveItemPending: removeItemMutation.isPending,
  };
}
