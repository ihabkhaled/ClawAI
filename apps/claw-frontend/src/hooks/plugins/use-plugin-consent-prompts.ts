import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import {
  PLUGIN_CONSENT_POLL_MAX_MS,
  PLUGIN_CONSENT_POLL_MS,
} from '@/constants/plugin-consent-card.constants';
import { pluginConsentRequestsRepository } from '@/repositories/plugins/plugin-consent-requests.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  DecideVariables,
  PluginConsentDecisionBody,
  PluginConsentRequestView,
} from '@/types/plugin-consent-card.types';
import { isOpenRequest } from '@/utilities/plugin-consent-card.utility';

/**
 * The questions waiting for the user's yes or no. Mounted only while a reply is in flight, it
 * looks every two seconds for at most three minutes (a request itself lives two), so the card
 * is found after a reload or a dropped stream too. A decision refreshes the list and the
 * installs, because "Always allow" changes what the Installed page shows.
 */
export function usePluginConsentPrompts() {
  const queryClient = useQueryClient();
  const startedAt = useRef(Date.now());
  const query = useQuery({
    queryKey: queryKeys.plugins.consentPending(),
    queryFn: () => pluginConsentRequestsRepository.listPending(),
    retry: false,
    refetchInterval: () =>
      Date.now() - startedAt.current < PLUGIN_CONSENT_POLL_MAX_MS ? PLUGIN_CONSENT_POLL_MS : false,
  });
  const decide = useMutation({
    mutationFn: (variables: DecideVariables) =>
      pluginConsentRequestsRepository.decide(variables.id, variables.body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.plugins.consentPending() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plugins.installsRoot() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plugins.serversRoot() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.plugins.chatGrants() }),
      ]);
    },
  });
  const { mutate } = decide;
  const answer = useCallback(
    (id: string, body: PluginConsentDecisionBody): void => {
      mutate({ id, body });
    },
    [mutate],
  );
  const refresh = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.plugins.consentPending() });
  }, [queryClient]);
  const open: PluginConsentRequestView[] = (query.data ?? []).filter((request) =>
    isOpenRequest(request, Date.now()),
  );
  return {
    requests: open,
    answer,
    refresh,
    isDeciding: decide.isPending,
    decideFailed: decide.isError,
  };
}
