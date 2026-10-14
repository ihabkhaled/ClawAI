import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ADMIN_CURATION_QUERY_KEYS } from '@/constants/plugin-admin-curation.constants';
import { useTranslation } from '@/lib/i18n';
import { pluginAdminCurationRepository } from '@/repositories/plugins/plugin-admin-curation.repository';
import type { RuleDraft, UseAdminCurationRulesReturn } from '@/types/plugin-admin-curation.types';
import { adminCurationErrorKey } from '@/utilities/plugin-admin-curation.utility';

const EMPTY_DRAFT: RuleDraft = { kind: 'DENY', match: 'HOST', pattern: '', note: '' };

/** Allow and deny rules by host, publisher or slug. */
export function useAdminCurationRules(): UseAdminCurationRulesReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draft, setDraftState] = useState<RuleDraft>(EMPTY_DRAFT);
  const query = useQuery({
    queryKey: ADMIN_CURATION_QUERY_KEYS.rules,
    queryFn: () => pluginAdminCurationRepository.listRules(),
  });
  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ADMIN_CURATION_QUERY_KEYS.rules });
  };
  const addMutation = useMutation({
    mutationFn: () =>
      pluginAdminCurationRepository.createRule({
        kind: draft.kind,
        match: draft.match,
        pattern: draft.pattern.trim(),
        ...(draft.note.trim().length > 0 ? { note: draft.note.trim() } : {}),
      }),
    onSuccess: async () => {
      setDraftState(EMPTY_DRAFT);
      await refresh();
    },
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => pluginAdminCurationRepository.removeRule(id),
    onSettled: refresh,
  });
  const failure = addMutation.error ?? removeMutation.error;
  return {
    rules: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => {
      void query.refetch();
    },
    draft,
    setDraft: (key, value) => {
      setDraftState((current) => ({ ...current, [key]: value }));
    },
    add: () => {
      addMutation.mutate();
    },
    isAdding: addMutation.isPending,
    remove: (id) => {
      removeMutation.mutate(id);
    },
    errorMessage: failure === null ? null : t(adminCurationErrorKey(failure)),
  };
}
