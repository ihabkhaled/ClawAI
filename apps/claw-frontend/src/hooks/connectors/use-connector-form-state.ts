import {
  getConnectorPreset,
  hasAccountIdPlaceholder,
  isValidPresetAccountId,
  presetRequiresAccountId,
  resolvePresetUrl,
} from '@claw/shared-utilities/connector-presets';
import { useEffect, useState } from 'react';

import { PROVIDER_DEFAULT_BASE_URLS } from '@/constants';
import { ConnectorAuthType, type ConnectorProvider } from '@/enums';
import { useConnectorGatewayHeaders } from '@/hooks/connectors/use-connector-gateway-headers';
import { createConnectorSchema } from '@/lib/validation/connector.schema';
import type {
  ConnectorFormFieldErrors,
  ConnectorFormStateParams,
  ConnectorFormStateReturn,
  CreateConnectorRequest,
} from '@/types';
import { toFrontendConnectorAuthType } from '@/utilities';
import { defaultCreditConnectorForProvider } from '@/utilities/connector-credit.utility';
import { gatewayHeaderRowsToRecord } from '@/utilities/connector-gateway-headers.utility';

export function useConnectorFormState({
  open,
  connector,
  onSubmit,
  onOpenChange,
}: ConnectorFormStateParams): ConnectorFormStateReturn {
  const [name, setName] = useState(connector?.name ?? '');
  const [provider, setProvider] = useState<ConnectorProvider | null>(connector?.provider ?? null);
  const [authType, setAuthType] = useState<ConnectorAuthType>(
    (connector?.authType as ConnectorAuthType) ?? ConnectorAuthType.API_KEY,
  );
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(connector?.baseUrl ?? '');
  const [region, setRegion] = useState(connector?.region ?? '');
  const [workspaceId, setWorkspaceId] = useState(connector?.workspaceId ?? '');
  const [accountId, setAccountId] = useState('');
  const [isCreditConnector, setIsCreditConnector] = useState(
    connector?.isPayAsYouGo ??
      (connector?.provider ? defaultCreditConnectorForProvider(connector.provider) : false),
  );
  const [fieldErrors, setFieldErrors] = useState<ConnectorFormFieldErrors>({});
  const gatewayHeaders = useConnectorGatewayHeaders();
  const resetGatewayHeaders = gatewayHeaders.reset;

  const isEditing = !!connector;

  useEffect(() => {
    if (open) {
      setName(connector?.name ?? '');
      setProvider(connector?.provider ?? null);
      setAuthType((connector?.authType as ConnectorAuthType) ?? ConnectorAuthType.API_KEY);
      setApiKey('');
      setBaseUrl(connector?.baseUrl ?? '');
      setRegion(connector?.region ?? '');
      setWorkspaceId(connector?.workspaceId ?? '');
      setAccountId('');
      setIsCreditConnector(
        connector?.isPayAsYouGo ??
          (connector?.provider ? defaultCreditConnectorForProvider(connector.provider) : false),
      );
      setFieldErrors({});
      resetGatewayHeaders();
    }
  }, [open, connector, resetGatewayHeaders]);

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setFieldErrors({});
    }
    onOpenChange(nextOpen);
  };

  // Picking a preset prefills the fields its registry entry knows — name,
  // base URL, auth type — while leaving every field editable afterward. The
  // name is only filled when the admin has not already typed one, so a
  // second click through the combobox never clobbers custom input.
  const onProviderSelect = (nextProvider: ConnectorProvider): void => {
    setProvider(nextProvider);
    setAccountId('');
    if (!isEditing) {
      setIsCreditConnector(defaultCreditConnectorForProvider(nextProvider));
    }
    const preset = getConnectorPreset(nextProvider);
    if (preset) {
      setName((prev) => (prev.trim().length > 0 ? prev : preset.displayName));
      setBaseUrl(preset.defaultBaseUrl);
      setAuthType(toFrontendConnectorAuthType(preset.authType));
    }
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const formData: Record<string, unknown> = {
      name,
      provider: provider ?? undefined,
      authType,
      isPayAsYouGo: isCreditConnector,
    };
    if (apiKey) {
      formData.apiKey = apiKey;
    }
    if (baseUrl) {
      formData.baseUrl = baseUrl;
    }
    if (region) {
      formData.region = region;
    }
    if (workspaceId) {
      formData.workspaceId = workspaceId;
    }
    if (accountId) {
      formData.accountId = accountId;
    }
    const headerRows = gatewayHeaderRowsToRecord(gatewayHeaders.rows);
    if (!headerRows.ok) {
      setFieldErrors({ gatewayHeaders: ['invalid'] });
      return;
    }
    if (Object.keys(headerRows.headers).length > 0) {
      formData.gatewayHeaders = headerRows.headers;
    } else if (isEditing && gatewayHeaders.clearStored) {
      // `{}` is the documented clear; omitting the field keeps what is stored.
      formData.gatewayHeaders = {};
    }

    const result = createConnectorSchema.safeParse(formData);

    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as ConnectorFormFieldErrors);
      return;
    }

    setFieldErrors({});
    onSubmit(result.data as CreateConnectorRequest);
  };

  const pendingLabel = isEditing ? 'Saving...' : 'Creating...';
  const submitLabel = isEditing ? 'Save Changes' : 'Create Connector';
  const defaultBaseUrl = provider !== null ? PROVIDER_DEFAULT_BASE_URLS[provider] : null;
  const selectedPreset = provider !== null ? getConnectorPreset(provider) : undefined;
  const requiresAccountId = provider !== null && presetRequiresAccountId(provider);
  const effectiveBaseUrl = baseUrl || defaultBaseUrl || '';
  const resolvedBaseUrlPreview =
    hasAccountIdPlaceholder(effectiveBaseUrl) && isValidPresetAccountId(accountId)
      ? resolvePresetUrl(effectiveBaseUrl, accountId)
      : null;

  return {
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
    isCreditConnector,
    setIsCreditConnector,
    fieldErrors,
    isEditing,
    pendingLabel,
    submitLabel,
    defaultBaseUrl,
    selectedPreset,
    resolvedBaseUrlPreview,
    gatewayHeaders: {
      rows: gatewayHeaders.rows,
      addRow: gatewayHeaders.addRow,
      updateRow: gatewayHeaders.updateRow,
      removeRow: gatewayHeaders.removeRow,
      clearStored: gatewayHeaders.clearStored,
      setClearStored: gatewayHeaders.setClearStored,
    },
    handleSubmit,
    handleOpenChange,
  };
}
