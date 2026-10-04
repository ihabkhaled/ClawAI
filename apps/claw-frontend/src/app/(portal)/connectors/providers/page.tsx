'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ConnectorProvider, ProviderAdapterFamily, ProviderModelsResponseFormat } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { providerDefinitionRepository } from '@/repositories/connectors/provider-definition.repository';
import type {
  CreateProviderDefinition,
  ProviderDefinition,
} from '@/types/provider-definition.types';
import { resolveApiErrorMessage, showToast } from '@/utilities';

export default function ConnectorProvidersPage(): React.ReactElement {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ProviderDefinition | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const providers = useQuery({
    queryKey: ['connector-provider-definitions', search],
    queryFn: () => providerDefinitionRepository.list(search),
  });
  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['connector-provider-definitions'] });
  };
  const create = useMutation({
    mutationFn: providerDefinitionRepository.create,
    onSuccess: () => {
      refresh();
      setEditing(null);
      showToast.success({ title: t('providerManagement.success') });
    },
    onError: (error: Error) =>
      showToast.apiError(error, resolveApiErrorMessage(error, t, t('providerManagement.error'))),
  });
  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof providerDefinitionRepository.update>[1];
    }) => providerDefinitionRepository.update(id, data),
    onSuccess: () => {
      refresh();
      setEditing(null);
      showToast.success({ title: t('providerManagement.success') });
    },
    onError: (error: Error) =>
      showToast.apiError(error, resolveApiErrorMessage(error, t, t('providerManagement.error'))),
  });
  const status = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      providerDefinitionRepository.setActive(id, isActive),
    onSuccess: refresh,
    onError: (error: Error) =>
      showToast.apiError(error, resolveApiErrorMessage(error, t, t('providerManagement.error'))),
  });
  const remove = useMutation({
    mutationFn: providerDefinitionRepository.remove,
    onSuccess: refresh,
    onError: (error: Error) =>
      showToast.apiError(error, resolveApiErrorMessage(error, t, t('providerManagement.error'))),
  });
  const connect = useMutation({
    mutationFn: connectorRepository.createConnector,
    onSuccess: () => {
      setConnectingId(null);
      showToast.success({ title: t('connectors.connectorCreated') });
    },
    onError: (error: Error) =>
      showToast.apiError(error, resolveApiErrorMessage(error, t, t('providerManagement.error'))),
  });

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data: CreateProviderDefinition = {
      key: String(form.get('key') ?? '')
        .trim()
        .toUpperCase(),
      displayName: String(form.get('displayName') ?? '').trim(),
      adapterFamily: ProviderAdapterFamily.OPENAI_COMPATIBLE,
      defaultBaseUrl: String(form.get('defaultBaseUrl') ?? '').trim(),
      modelsEndpoint: String(form.get('modelsEndpoint') ?? '').trim(),
      modelsResponseFormat: ProviderModelsResponseFormat.OPENAI_LIST,
      authType: String(form.get('authType') ?? 'API_KEY') as CreateProviderDefinition['authType'],
      supportsNativeTools: form.has('supportsNativeTools'),
      supportsVision: form.has('supportsVision'),
      defaultIsPayAsYouGo: form.has('defaultIsPayAsYouGo'),
      hasFreeTier: form.has('hasFreeTier'),
      ...(String(form.get('description') ?? '').trim()
        ? { description: String(form.get('description')).trim() }
        : {}),
      ...(String(form.get('healthCheckEndpoint') ?? '').trim()
        ? { healthCheckEndpoint: String(form.get('healthCheckEndpoint')).trim() }
        : {}),
    };
    if (editing) {
      update.mutate({
        id: editing.id,
        data: {
          displayName: data.displayName,
          description: data.description,
          defaultBaseUrl: data.defaultBaseUrl,
          modelsEndpoint: data.modelsEndpoint,
          healthCheckEndpoint: data.healthCheckEndpoint,
          supportsNativeTools: data.supportsNativeTools,
          supportsVision: data.supportsVision,
          defaultIsPayAsYouGo: data.defaultIsPayAsYouGo,
          hasFreeTier: data.hasFreeTier,
        },
      });
    } else {
      create.mutate(data);
    }
  };

  const busy = create.isPending || update.isPending;
  const submitConnector = (
    event: FormEvent<HTMLFormElement>,
    provider: ProviderDefinition,
  ): void => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    connect.mutate({
      name: String(form.get('connectorName') ?? '').trim(),
      provider: ConnectorProvider.CUSTOM_OPENAI_COMPATIBLE,
      providerDefinitionId: provider.id,
      authType: provider.authType ?? 'API_KEY',
      ...(String(form.get('apiKey') ?? '').trim()
        ? { apiKey: String(form.get('apiKey')).trim() }
        : {}),
    });
  };
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t('providerManagement.title')}
        description={t('providerManagement.description')}
      />
      <Card>
        <CardHeader>
          <CardTitle>{editing ? t('common.edit') : t('providerManagement.create')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!editing ? (
              <Field
                label={t('providerManagement.key')}
                name="key"
                required
                pattern="[A-Za-z][A-Za-z0-9_]{1,62}"
              />
            ) : null}
            <Field
              label={t('providerManagement.name')}
              name="displayName"
              required
              defaultValue={editing?.displayName}
            />
            <Field
              label={t('providerManagement.baseUrl')}
              name="defaultBaseUrl"
              type="url"
              required
              defaultValue={editing?.defaultBaseUrl}
            />
            <Field
              label={t('providerManagement.modelsPath')}
              name="modelsEndpoint"
              required
              defaultValue={editing?.modelsEndpoint ?? '/v1/models'}
            />
            <Field
              label={t('providerManagement.healthPath')}
              name="healthCheckEndpoint"
              defaultValue={editing?.healthCheckEndpoint ?? '/v1/models'}
            />
            {!editing ? (
              <label className="grid grid-cols-1 gap-2 text-sm font-medium">
                {t('providerManagement.authType')}
                <select
                  name="authType"
                  defaultValue="API_KEY"
                  className="border-input bg-background h-10 rounded-md border px-3"
                >
                  <option value="API_KEY">API key</option>
                  <option value="NONE">None</option>
                  <option value="OAUTH2">OAuth2</option>
                </select>
              </label>
            ) : null}
            <div className="flex flex-wrap gap-4 sm:col-span-2">
              <Toggle
                name="supportsNativeTools"
                label={t('providerManagement.tools')}
                checked={editing?.supportsNativeTools}
              />
              <Toggle
                name="supportsVision"
                label={t('providerManagement.vision')}
                checked={editing?.supportsVision}
              />
              <Toggle
                name="defaultIsPayAsYouGo"
                label={t('providerManagement.payg')}
                checked={editing?.defaultIsPayAsYouGo}
              />
              <Toggle
                name="hasFreeTier"
                label={t('providerManagement.freeTier')}
                checked={editing?.hasFreeTier}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {editing ? t('common.save') : t('providerManagement.save')}
              </Button>
              {editing ? (
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  {t('providerManagement.cancel')}
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label={t('providerManagement.search')}
          placeholder={t('providerManagement.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {providers.isError ? (
        <p role="alert" className="text-destructive">
          {t('providerManagement.error')}
        </p>
      ) : null}
      {providers.isLoading ? <p role="status">{t('common.loading')}</p> : null}
      {providers.data?.data.length === 0 ? <p>{t('providerManagement.empty')}</p> : null}
      <section aria-label={t('providerManagement.title')} className="grid grid-cols-1 gap-4">
        {providers.data?.data.map((provider) => (
          <Card key={provider.id}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-semibold">
                  {provider.displayName}{' '}
                  <span className="text-muted-foreground text-sm">({provider.key})</span>
                  {provider.isBuiltIn ? (
                    <span className="text-muted-foreground text-xs">
                      {t('providerManagement.builtIn')}
                    </span>
                  ) : null}
                </h2>
                <p className="text-muted-foreground text-sm break-all">
                  {provider.defaultBaseUrl && provider.modelsEndpoint
                    ? `${provider.defaultBaseUrl}${provider.modelsEndpoint}`
                    : provider.adapterFamily}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t('providerManagement.dependencies', {
                    connectors: provider.connectorCount,
                    models: provider.modelCount,
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!provider.isBuiltIn ? (
                  <>
                    <Button variant="outline" onClick={() => setEditing(provider)}>
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setConnectingId(connectingId === provider.id ? null : provider.id)
                      }
                      disabled={!provider.isActive}
                    >
                      {t('connectors.addConnector')}
                    </Button>
                  </>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() => status.mutate({ id: provider.id, isActive: !provider.isActive })}
                  disabled={status.isPending}
                >
                  {provider.isActive
                    ? t('providerManagement.deactivate')
                    : t('providerManagement.activate')}
                </Button>
                {!provider.isBuiltIn ? (
                  <Button
                    variant="destructive"
                    onClick={() => remove.mutate(provider.id)}
                    disabled={remove.isPending}
                  >
                    {t('providerManagement.delete')}
                  </Button>
                ) : null}
              </div>
              {connectingId === provider.id ? (
                <form
                  onSubmit={(event) => submitConnector(event, provider)}
                  className="grid grid-cols-1 gap-3 border-t pt-4 sm:col-span-2 sm:grid-cols-3"
                >
                  <label className="grid grid-cols-1 gap-2 text-sm font-medium">
                    {t('connectors.name')}
                    <Input name="connectorName" required maxLength={100} />
                  </label>
                  <label className="grid grid-cols-1 gap-2 text-sm font-medium">
                    {t('connectors.apiKey')}
                    <Input
                      name="apiKey"
                      type="password"
                      autoComplete="new-password"
                      required={provider.authType === 'API_KEY'}
                    />
                  </label>
                  <div className="flex items-end">
                    <Button type="submit" disabled={connect.isPending}>
                      {t('connectors.createConnector')}
                    </Button>
                  </div>
                </form>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}

function Field(props: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  pattern?: string;
  defaultValue?: string | null;
}): React.ReactElement {
  return (
    <label className="grid grid-cols-1 gap-2 text-sm font-medium">
      {props.label}
      <Input
        name={props.name}
        type={props.type ?? 'text'}
        required={props.required}
        pattern={props.pattern}
        defaultValue={props.defaultValue ?? ''}
      />
    </label>
  );
}

function Toggle(props: { name: string; label: string; checked?: boolean }): React.ReactElement {
  return (
    <label className="flex min-h-10 items-center gap-2 text-sm">
      <input type="checkbox" name={props.name} defaultChecked={props.checked} />
      {props.label}
    </label>
  );
}
