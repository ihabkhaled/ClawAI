import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { contextPackVersionsRepository } from '@/repositories/context-packs/context-pack-versions.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ContextPackVersion, VersionDiff } from '@/types';

export function useContextPackVersions(packId: string | null) {
  const query = useQuery<ContextPackVersion[]>({
    queryKey: queryKeys.contextPacks.versions(packId ?? 'none'),
    queryFn: () => contextPackVersionsRepository.list(packId ?? ''),
    enabled: packId !== null && packId.length > 0,
  });
  return {
    versions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export function useSnapshotContextPack() {
  const queryClient = useQueryClient();
  return useMutation<ContextPackVersion, Error, { packId: string; summary?: string }>({
    mutationFn: ({ packId, summary }) => contextPackVersionsRepository.snapshot(packId, summary),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.contextPacks.versions(vars.packId),
      });
    },
  });
}

export function useRevertContextPack() {
  const queryClient = useQueryClient();
  return useMutation<ContextPackVersion, Error, { packId: string; version: number }>({
    mutationFn: ({ packId, version }) => contextPackVersionsRepository.revert(packId, version),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contextPacks.all });
    },
  });
}

export function useContextPackDiff(
  packId: string | null,
  fromVersion: number | null,
  toVersion: number | null,
) {
  const enabled =
    packId !== null && fromVersion !== null && toVersion !== null && fromVersion !== toVersion;
  const query = useQuery<VersionDiff>({
    queryKey: queryKeys.contextPacks.versionDiff(
      packId ?? 'none',
      fromVersion ?? 0,
      toVersion ?? 0,
    ),
    queryFn: () =>
      contextPackVersionsRepository.diff(packId ?? '', fromVersion ?? 0, toVersion ?? 0),
    enabled,
  });
  return {
    diff: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
