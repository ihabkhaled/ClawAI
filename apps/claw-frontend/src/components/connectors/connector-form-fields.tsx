import { Info } from 'lucide-react';

import { PasswordInput } from '@/components/common/password-input';
import { ConnectorPresetLinks } from '@/components/connectors/connector-preset-links';
import { ConnectorProviderCombobox } from '@/components/connectors/connector-provider-combobox';
import { FieldHint } from '@/components/connectors/field-hint';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AUTH_TYPE_LABELS, CONNECTOR_AUTH_TYPE_OPTIONS } from '@/constants';
import { ConnectorAuthType, ConnectorProvider } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import type { ConnectorFormFieldsProps } from '@/types';

export function ConnectorFormFields({
  fieldErrors,
  isEditing,
  name,
  setName,
  provider,
  onProviderSelect,
  authType,
  setAuthType,
  apiKey,
  setApiKey,
  baseUrl,
  setBaseUrl,
  region,
  setRegion,
  workspaceId,
  setWorkspaceId,
  accountId,
  setAccountId,
  requiresAccountId,
  defaultBaseUrl,
  selectedPreset,
  resolvedBaseUrlPreview,
}: ConnectorFormFieldsProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-2">
        <label htmlFor="connector-name" className="text-sm font-medium">
          {t('connectors.name')}
        </label>
        <Input
          id="connector-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('connectors.namePlaceholder')}
        />
        <FieldHint text={t('connectors.nameHelp')} />
        {fieldErrors.name ? (
          <p className="text-destructive mt-1 text-sm">{fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2">
        <label htmlFor="connector-provider" className="text-sm font-medium">
          {t('connectors.provider')}
        </label>
        <ConnectorProviderCombobox
          value={provider}
          onChange={onProviderSelect}
          disabled={isEditing}
        />
        <FieldHint text={t('connectors.providerHelp')} />
        {fieldErrors.provider ? (
          <p className="text-destructive mt-1 text-sm">{fieldErrors.provider[0]}</p>
        ) : null}
        {selectedPreset ? <ConnectorPresetLinks preset={selectedPreset} /> : null}
      </div>

      <div className="grid grid-cols-1 gap-2">
        <label htmlFor="connector-auth" className="text-sm font-medium">
          {t('connectors.authType')}
        </label>
        <Select value={authType} onValueChange={(value) => setAuthType(value as ConnectorAuthType)}>
          <SelectTrigger id="connector-auth">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONNECTOR_AUTH_TYPE_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {AUTH_TYPE_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldHint text={t('connectors.authTypeHelp')} />
        {fieldErrors.authType ? (
          <p className="text-destructive mt-1 text-sm">{fieldErrors.authType[0]}</p>
        ) : null}
      </div>

      {authType === ConnectorAuthType.API_KEY ? (
        <div className="grid grid-cols-1 gap-2">
          <label htmlFor="connector-api-key" className="text-sm font-medium">
            {t('connectors.apiKey')}
          </label>
          <PasswordInput
            id="connector-api-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              isEditing ? t('connectors.apiKeyPlaceholderEdit') : t('connectors.apiKeyPlaceholder')
            }
          />
          <FieldHint text={t('connectors.apiKeyHelp')} />
          {fieldErrors.apiKey ? (
            <p className="text-destructive mt-1 text-sm">{fieldErrors.apiKey[0]}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2">
        <label htmlFor="connector-base-url" className="text-sm font-medium">
          {t('connectors.baseUrlOptional')}
        </label>
        <Input
          id="connector-base-url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={defaultBaseUrl ?? t('connectors.baseUrlPlaceholder')}
        />
        <FieldHint text={t('connectors.baseUrlHelp')} />
        {defaultBaseUrl !== null ? (
          <p className="text-muted-foreground text-xs">
            {t('connectors.defaultLabel')}{' '}
            <code className="bg-muted rounded px-1 py-0.5">{defaultBaseUrl}</code>
          </p>
        ) : null}
        {fieldErrors.baseUrl ? (
          <p className="text-destructive mt-1 text-sm">{fieldErrors.baseUrl[0]}</p>
        ) : null}
      </div>

      {provider === ConnectorProvider.AWS_BEDROCK ? (
        <div className="grid grid-cols-1 gap-2">
          <label htmlFor="connector-region" className="text-sm font-medium">
            {t('connectors.region')}
          </label>
          <Input
            id="connector-region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder={t('connectors.regionPlaceholder')}
          />
          <FieldHint text={t('connectors.regionHelp')} />
          {fieldErrors.region ? (
            <p className="text-destructive mt-1 text-sm">{fieldErrors.region[0]}</p>
          ) : null}
        </div>
      ) : null}

      {provider === ConnectorProvider.ANTHROPIC ? (
        <div className="grid grid-cols-1 gap-2">
          <label htmlFor="connector-workspace-id" className="text-sm font-medium">
            {t('connectors.workspaceIdOptional')}
          </label>
          <Input
            id="connector-workspace-id"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder={t('connectors.workspaceIdPlaceholder')}
          />
          <FieldHint text={t('connectors.workspaceIdHelp')} />
          {fieldErrors.workspaceId ? (
            <p className="text-destructive mt-1 text-sm">{fieldErrors.workspaceId[0]}</p>
          ) : null}
        </div>
      ) : null}

      {requiresAccountId ? (
        <div className="grid grid-cols-1 gap-2">
          <label htmlFor="connector-account-id" className="text-sm font-medium">
            {t('connectors.accountId')}
          </label>
          <Input
            id="connector-account-id"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder={t('connectors.accountIdPlaceholder')}
          />
          <FieldHint text={t('connectors.accountIdHelp')} />
          {fieldErrors.accountId ? (
            <p className="text-destructive mt-1 text-sm">{fieldErrors.accountId[0]}</p>
          ) : null}
          {resolvedBaseUrlPreview !== null ? (
            <p className="text-muted-foreground text-xs">
              {t('connectors.resolvedUrlLabel')}{' '}
              <code className="bg-muted rounded px-1 py-0.5">{resolvedBaseUrlPreview}</code>
            </p>
          ) : null}
        </div>
      ) : null}

      {!isEditing ? (
        <div className="bg-muted/50 text-muted-foreground flex items-start gap-2 rounded-md border p-3 text-xs">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t('connectors.saveFirstThenTest')}</span>
        </div>
      ) : null}
    </div>
  );
}
