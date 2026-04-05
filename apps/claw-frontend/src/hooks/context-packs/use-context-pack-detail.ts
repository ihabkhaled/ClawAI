import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { contextPacksRepository } from '@/repositories/context-packs/context-packs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  UpdateContextPackRequest,
  CreateContextPackItemRequest,
  UpdateContextPackItemRequest,
} from '@/types';
import { showToast } from '@/utilities';

export function useContextPackDetail(id: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.contextPacks.detail(id ?? ''),
    queryFn: () => contextPacksRepository.getContextPack(id ?? ''),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateContextPackRequest) =>
      contextPacksRepository.updateContextPack(id ?? '', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.detail(id ?? ''),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.lists(),
      });
      showToast.success({ description: 'Context pack updated' });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, 'Failed to update context pack');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => contextPacksRepository.deleteContextPack(id ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.lists(),
      });
      showToast.success({ description: 'Context pack deleted' });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, 'Failed to delete context pack');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (data: CreateContextPackItemRequest) =>
      contextPacksRepository.addItem(id ?? '', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.detail(id ?? ''),
      });
      showToast.success({ description: 'Item added to context pack' });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, 'Failed to add item');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateContextPackItemRequest }) =>
      contextPacksRepository.updateItem(id ?? '', itemId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.detail(id ?? ''),
      });
      showToast.success({ description: 'Context pack item updated' });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, 'Failed to update item');
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => contextPacksRepository.removeItem(id ?? '', itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.detail(id ?? ''),
      });
      showToast.success({ description: 'Item removed from context pack' });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, 'Failed to remove item');
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
