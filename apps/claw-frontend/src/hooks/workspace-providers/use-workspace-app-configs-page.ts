import { useMemo, useState } from 'react';

import {
  EMPTY_APP_CONFIG_FORM,
  WORKSPACE_OAUTH_CALLBACK_PATH,
} from '@/constants/workspace-providers.constants';
import { Permission } from '@/enums';
import { WorkspaceProviderAuthMode } from '@/enums/workspace-provider-auth-mode.enum';
import { usePermissions } from '@/hooks/auth/use-permissions';
import { useTranslation } from '@/lib/i18n';
import type {
  ProviderAppConfigFormValues,
  UseAppConfigsPageReturn,
  WorkspaceProviderAppConfig,
  WorkspaceProviderDefinition,
} from '@/types';
import { normalizeStringRecord } from '@/utilities/workspace-provider-config.utility';

import {
  useCreateProviderAppConfig,
  useDeleteProviderAppConfig,
  useInitOAuth,
  useProviderAppConfigs,
  useTestConnection,
  useUpdateProviderAppConfig,
} from './use-provider-app-configs';
import { useProviderCatalog } from './use-provider-catalog';

export function useWorkspaceAppConfigsPage(): UseAppConfigsPageReturn {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const canManage = permissions.isAdmin || permissions.can(Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE);
  const catalog = useProviderCatalog();
  const list = useProviderAppConfigs();
  const createMutation = useCreateProviderAppConfig();
  const updateMutation = useUpdateProviderAppConfig();
  const deleteMutation = useDeleteProviderAppConfig();
  const testMutation = useTestConnection();
  const initOAuthMutation = useInitOAuth();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
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

  const openEditDialog = (config: WorkspaceProviderAppConfig): void => {
    const publicConfig = normalizeStringRecord(config.publicConfig);
    setForm({
      provider: config.provider,
      name: config.name,
      description: config.description ?? '',
      authMode: config.authMode,
      publicConfig,
      secretConfig: {},
    });
    setEditingConfigId(config.id);
    setFieldErrors({});
    setIsEditOpen(true);
  };

  const closeEditDialog = (): void => {
    setIsEditOpen(false);
    setEditingConfigId(null);
    setForm(EMPTY_APP_CONFIG_FORM);
    setFieldErrors({});
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

  const handleEditSubmit = async (): Promise<void> => {
    setFieldErrors({});
    if (editingConfigId === null || form.name.trim().length === 0) {
      setFieldErrors({ name: t('workspaceProviders.appConfigs.errors.nameRequired') });
      return;
    }
    const hasSecretChange = Object.values(form.secretConfig).some(
      (v) => typeof v === 'string' && v.length > 0,
    );
    try {
      await updateMutation.mutateAsync({
        id: editingConfigId,
        data: {
          name: form.name.trim(),
          description: form.description.trim() === '' ? undefined : form.description.trim(),
          authMode: form.authMode,
          publicConfig: form.publicConfig,
          secretConfig: hasSecretChange ? form.secretConfig : undefined,
        },
      });
      closeEditDialog();
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

  const handleConnect = async (id: string, provider: string): Promise<void> => {
    const redirectUri = `${window.location.origin}${WORKSPACE_OAUTH_CALLBACK_PATH}`;
    const result = await initOAuthMutation.mutateAsync({
      provider,
      providerAppConfigId: id,
      redirectUri,
    });
    window.location.href = result.authorizationUrl;
  };

  return {
    t,
    providers: catalog.providers,
    configs: list.configs,
    isLoading: catalog.isLoading || list.isLoading,
    isError: catalog.isError || list.isError,
    isCreateOpen,
    isEditOpen,
    editingConfigId,
    form,
    fieldErrors,
    isCreatePending: createMutation.isPending,
    isEditPending: updateMutation.isPending,
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
    openEditDialog,
    closeEditDialog,
    setFormField,
    setFormProvider,
    setFormAuthMode,
    setPublicField,
    setSecretField,
    handleSubmit,
    handleEditSubmit,
    handleDelete,
    handleTest,
    handleConnect,
    isConnectPending: initOAuthMutation.isPending,
    canManage,
  };
}
