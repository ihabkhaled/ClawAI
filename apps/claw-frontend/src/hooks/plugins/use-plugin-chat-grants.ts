import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { pluginConsentRequestsRepository } from '@/repositories/plugins/plugin-consent-requests.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

/** The signed-in user's "Allow for this chat" grants, and revoking one. */
export function usePluginChatGrants() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.plugins.chatGrants(),
    queryFn: () => pluginConsentRequestsRepository.listGrants(),
    retry: false,
  });
  const revoke = useMutation({
    mutationFn: (id: string) => pluginConsentRequestsRepository.revokeGrant(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.plugins.chatGrants() }),
  });
  return {
    grants: query.data ?? [],
    revoke: revoke.mutate,
    isRevoking: revoke.isPending,
    revokeFailed: revoke.isError,
  };
}
