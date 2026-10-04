import type { FormEvent } from 'react';

import { ProviderField, ProviderToggle } from '@/components/connectors/provider-form-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PROVIDER_AUTH_TYPE_OPTIONS,
  PROVIDER_MODELS_FORMAT_OPTIONS,
  PROVIDER_SELECT_CLASS,
} from '@/constants';
import { useTranslation } from '@/lib/i18n';
import type { ProviderDefinitionFormProps } from '@/types/provider-definition.types';
import { readProviderDefinitionForm } from '@/utilities/provider-definition-form.utility';

/**
 * Create / edit form for a connector provider. The parent keys it by provider
 * id (and a reset counter), so switching provider or finishing a create always
 * remounts it with that provider's values — never the previous one's.
 */
export function ProviderDefinitionForm({
  editing,
  busy,
  onSubmit,
  onCancel,
}: ProviderDefinitionFormProps): React.ReactElement {
  const { t } = useTranslation();
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit(readProviderDefinitionForm(new FormData(event.currentTarget)));
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>{editing ? t('common.edit') : t('providerManagement.create')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {editing ? null : (
            <ProviderField
              label={t('providerManagement.key')}
              name="key"
              required
              pattern="[A-Za-z][A-Za-z0-9_\- ]{1,62}"
            />
          )}
          <ProviderField
            label={t('providerManagement.name')}
            name="displayName"
            required
            defaultValue={editing?.displayName}
          />
          <ProviderField
            label={t('providerManagement.providerDescription')}
            name="description"
            defaultValue={editing?.description}
          />
          <ProviderField
            label={t('providerManagement.baseUrl')}
            name="defaultBaseUrl"
            type="url"
            required
            defaultValue={editing?.defaultBaseUrl}
          />
          <ProviderField
            label={t('providerManagement.modelsPath')}
            name="modelsEndpoint"
            required
            defaultValue={editing?.modelsEndpoint ?? '/v1/models'}
          />
          <label className="grid grid-cols-1 gap-2 text-sm font-medium">
            {t('providerManagement.modelsFormat')}
            <select
              name="modelsResponseFormat"
              defaultValue={editing?.modelsResponseFormat ?? 'OPENAI_LIST'}
              className={PROVIDER_SELECT_CLASS}
            >
              {PROVIDER_MODELS_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ProviderField
            label={t('providerManagement.healthPath')}
            name="healthCheckEndpoint"
            defaultValue={editing ? editing.healthCheckEndpoint : '/v1/models'}
          />
          <label className="grid grid-cols-1 gap-2 text-sm font-medium">
            {t('providerManagement.authType')}
            <select
              name="authType"
              defaultValue={editing?.authType ?? 'API_KEY'}
              className={PROVIDER_SELECT_CLASS}
            >
              {PROVIDER_AUTH_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ProviderField
            label={t('providerManagement.authHeaderName')}
            name="authHeaderName"
            required
            defaultValue={editing?.authHeaderName ?? 'Authorization'}
          />
          <ProviderField
            label={t('providerManagement.authHeaderScheme')}
            name="authHeaderScheme"
            defaultValue={editing?.authHeaderScheme ?? 'Bearer'}
          />
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <ProviderToggle
              name="supportsNativeTools"
              label={t('providerManagement.tools')}
              checked={editing?.supportsNativeTools}
            />
            <ProviderToggle
              name="supportsVision"
              label={t('providerManagement.vision')}
              checked={editing?.supportsVision}
            />
            <ProviderToggle
              name="defaultIsPayAsYouGo"
              label={t('providerManagement.payg')}
              checked={editing?.defaultIsPayAsYouGo}
            />
            <ProviderToggle
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
              <Button type="button" variant="outline" onClick={onCancel}>
                {t('providerManagement.cancel')}
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
