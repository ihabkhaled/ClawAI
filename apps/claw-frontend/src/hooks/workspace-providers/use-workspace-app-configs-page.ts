import { useMemo, useState } from 'react';

import { EMPTY_APP_CONFIG_FORM } from '@/constants/workspace-providers.constants';
import { WorkspaceProviderAuthMode } from '@/enums/workspace-provider-auth-mode.enum';
import { useTranslation } from '@/lib/i18n';
import type {
  ProviderAppConfigFormValues,
  UseAppConfigsPageReturn,
  WorkspaceProviderDefinition,
} from '@/types';

import {
  useCreateProviderAppConfig,
  useDeleteProviderAppConfig,
  useProviderAppConfigs,
  useTestConnection,
} from './use-provider-app-configs';
import { useProviderCatalog } from './use-provider-catalog';

export function useWorkspaceAppConfigsPage(): UseAppConfigsPageReturn {
  const { t } = useTranslation();
  const catalog = useProviderCatalog();
  const list = useProviderAppConfigs();
  const createMutation = useCreateProviderAppConfig();
  const deleteMutation = useDeleteProviderAppConfig();
  const testMutation = useTestConnection();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<ProviderAppConfigFormValues>(EMPTY_APP_CONFIG_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});

  const selectedProvider = useMemo<WorkspaceProviderDefinition | null>(() => {
    if (form.provider.length === 0) {
      return null;
    }
    return catalog.providers.find((p) => p.provider === form.provider) ?? null;
  }, [catalog.providers, form.provider]);

  const setFormField = <K extends keyof ProviderAppConfigFormValues>(
    key: K,
    value: ProviderAppConfigFormValues[K],
  ): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setFormProvider = (provider: string): void => {
    const def = catalog.providers.find((p) => p.provider === provider);
    setForm({
      provider,
      name: '',
      description: '',
      authMode: def?.defaultAuthMode ?? WorkspaceProviderAuthMode.OAUTH2,
      publicConfig: {},
      secretConfig: {},
    });
    setFieldErrors({});
  };

  const setFormAuthMode = (mode: WorkspaceProviderAuthMode): void => {
    setForm((prev) => ({ ...prev, authMode: mode }));
  };

  const setPublicField = (key: string, value: string): void => {
    setForm((prev) => ({ ...prev, publicConfig: { ...prev.publicConfig, [key]: value } }));
  };

  const setSecretField = (key: string, value: string): void => {
    setForm((prev) => ({ ...prev, secretConfig: { ...prev.secretConfig, [key]: value } }));
  };

  const handleSubmit = async (): Promise<void> => {
    setFieldErrors({});
    if (form.provider.length === 0 || form.name.trim().length === 0) {
      setFieldErrors({ name: t('workspaceProviders.appConfigs.errors.nameRequired') });
      return;
    }
    try {
      await createMutation.mutateAsync({
        provider: form.provider,
        name: form.name.trim(),
        description: form.description.trim() === '' ? undefined : form.description.trim(),
        authMode: form.authMode,
        publicConfig: form.publicConfig,
        secretConfig: Object.keys(form.secretConfig).length === 0 ? undefined : form.secretConfig,
      });
      setForm(EMPTY_APP_CONFIG_FORM);
      setIsCreateOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setFieldErrors({ _form: message });
    }
  };

  const handleDelete = (id: string): void => {
    deleteMutation.mutate(id);
  };

  const handleTest = (id: string, provider: string): void => {
    testMutation.mutate({ provider, providerAppConfigId: id });
  };

  return {
    t,
    providers: catalog.providers,
    configs: list.configs,
    isLoading: catalog.isLoading || list.isLoading,
    isError: catalog.isError || list.isError,
    isCreateOpen,
    form,
    fieldErrors,
    isCreatePending: createMutation.isPending,
    isDeletePending: deleteMutation.isPending,
    isTestPending: testMutation.isPending,
    testResult: testMutation.lastResult,
    selectedProvider,
    openCreateDialog: () => setIsCreateOpen(true),
    closeCreateDialog: () => {
      setIsCreateOpen(false);
      setForm(EMPTY_APP_CONFIG_FORM);
      setFieldErrors({});
    },
    setFormField,
    setFormProvider,
    setFormAuthMode,
    setPublicField,
    setSecretField,
    handleSubmit,
    handleDelete,
    handleTest,
  };
}
