import { useState } from 'react';

import { INITIAL_RESEARCH_PROVIDER_FORM } from '@/constants/research.constants';
import { useTranslation } from '@/lib/i18n';
import type {
  CreateResearchProviderRequest,
  ResearchProviderFormState,
  UseResearchProvidersPageReturn,
} from '@/types';

import {
  useCreateResearchProvider,
  useDeleteResearchProvider,
  useResearchProviders,
  useTestResearchProvider,
} from './use-research-providers';

export function useResearchProvidersPage(): UseResearchProvidersPageReturn {
  const { t } = useTranslation();
  const list = useResearchProviders();
  const create = useCreateResearchProvider();
  const del = useDeleteResearchProvider();
  const test = useTestResearchProvider();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<ResearchProviderFormState>(INITIAL_RESEARCH_PROVIDER_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [lastTestMessage, setLastTestMessage] = useState<string | null>(null);

  const setFormField: UseResearchProvidersPageReturn['setFormField'] = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    setCreateError(null);
    try {
      const body: CreateResearchProviderRequest = {
        kind: form.kind,
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim(),
        secretConfig: form.apiKey.trim().length > 0 ? { apiKey: form.apiKey.trim() } : undefined,
      };
      await create.mutateAsync(body);
      setIsCreateOpen(false);
      setForm(INITIAL_RESEARCH_PROVIDER_FORM);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleTest = (id: string): void => {
    test.mutate(id, {
      onSuccess: (result) => {
        const status = result.healthy
          ? t('research.providers.healthy')
          : t('research.providers.unhealthy');
        setLastTestMessage(`${status} — ${String(result.latencyMs)}ms`);
      },
    });
  };

  return {
    t,
    providers: list.providers,
    isLoading: list.isLoading,
    isError: list.isError,
    isCreateOpen,
    openCreate: () => setIsCreateOpen(true),
    closeCreate: () => setIsCreateOpen(false),
    form,
    setFormField,
    isCreatePending: create.isPending,
    createError,
    isDeletePending: del.isPending,
    isTestPending: test.isPending,
    lastTestMessage,
    handleSubmit,
    handleDelete: (id) => del.mutate(id),
    handleTest,
  };
}
