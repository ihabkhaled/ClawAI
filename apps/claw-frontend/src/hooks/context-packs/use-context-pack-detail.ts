import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { contextPacksRepository } from '@/repositories/context-packs/context-packs.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  UpdateContextPackRequest,
  CreateContextPackItemRequest,
  UpdateContextPackItemRequest,
} from '@/types';
import { logger, showToast } from '@/utilities';

export function useContextPackDetail(id: string | null) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: queryKeys.contextPacks.detail(id ?? ''),
    queryFn: () => {
      logger.debug({ component: 'memory', action: 'fetch-context-pack-detail', message: 'Fetching context pack detail', details: { packId: id } });
      return contextPacksRepository.getContextPack(id ?? '');
    },
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
      showToast.success({ description: t('context.packUpdated') });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, t('context.packUpdateFailed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => contextPacksRepository.deleteContextPack(id ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.lists(),
      });
      showToast.success({ description: t('context.packDeleted') });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, t('context.packDeleteFailed'));
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (data: CreateContextPackItemRequest) =>
      contextPacksRepository.addItem(id ?? '', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.detail(id ?? ''),
      });
      showToast.success({ description: t('context.itemAdded') });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, t('context.itemAddFailed'));
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateContextPackItemRequest }) =>
      contextPacksRepository.updateItem(id ?? '', itemId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.detail(id ?? ''),
      });
      showToast.success({ description: t('context.itemUpdated') });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, t('context.itemUpdateFailed'));
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => contextPacksRepository.removeItem(id ?? '', itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.detail(id ?? ''),
      });
      showToast.success({ description: t('context.itemRemoved') });
    },
    onError: (err: unknown) => {
      showToast.apiError(err, t('context.itemRemoveFailed'));
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
