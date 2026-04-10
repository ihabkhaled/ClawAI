import { useEffect, useState } from 'react';

import { PROVIDER_DEFAULT_BASE_URLS } from '@/constants';
import { ConnectorAuthType, type ConnectorProvider } from '@/enums';
import { createConnectorSchema } from '@/lib/validation/connector.schema';
import type {
  ConnectorFormFieldErrors,
  ConnectorFormStateParams,
  ConnectorFormStateReturn,
  CreateConnectorRequest,
} from '@/types';

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
  const [fieldErrors, setFieldErrors] = useState<ConnectorFormFieldErrors>({});

  const isEditing = !!connector;

  useEffect(() => {
    if (open) {
      setName(connector?.name ?? '');
      setProvider(connector?.provider ?? null);
      setAuthType((connector?.authType as ConnectorAuthType) ?? ConnectorAuthType.API_KEY);
      setApiKey('');
      setBaseUrl(connector?.baseUrl ?? '');
      setRegion(connector?.region ?? '');
      setFieldErrors({});
    }
  }, [open, connector]);

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setFieldErrors({});
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const formData: Record<string, unknown> = {
      name,
      provider: provider ?? undefined,
      authType,
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

  return {
    name,
    setName,
    provider,
    setProvider,
    authType,
    setAuthType,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    region,
    setRegion,
    fieldErrors,
    isEditing,
    pendingLabel,
    submitLabel,
    defaultBaseUrl,
    handleSubmit,
    handleOpenChange,
  };
}
