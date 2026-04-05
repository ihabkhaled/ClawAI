import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AUTH_TYPE_LABELS,
  CONNECTOR_AUTH_TYPE_OPTIONS,
  CONNECTOR_PROVIDER_OPTIONS,
  PROVIDER_DISPLAY_NAMES,
} from '@/constants';
import { ConnectorAuthType, ConnectorProvider } from '@/enums';
import { createConnectorSchema } from '@/lib/validation/connector.schema';
import type { ConnectorFormFieldErrors, ConnectorFormProps, CreateConnectorRequest } from '@/types';

export function ConnectorForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  connector,
}: ConnectorFormProps) {
  const [name, setName] = useState(connector?.name ?? '');
  const [provider, setProvider] = useState<ConnectorProvider | null>(connector?.provider ?? null);
  const [authType, setAuthType] = useState(connector?.authType ?? ConnectorAuthType.API_KEY);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(connector?.baseUrl ?? '');
  const [region, setRegion] = useState(connector?.region ?? '');
  const [fieldErrors, setFieldErrors] = useState<ConnectorFormFieldErrors>({});

  const isEditing = !!connector;

  useEffect(() => {
    if (open) {
      setName(connector?.name ?? '');
      setProvider(connector?.provider ?? null);
      setAuthType(connector?.authType ?? ConnectorAuthType.API_KEY);
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
      provider: provider || undefined,
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Connector' : 'Add Connector'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your connector configuration.'
              : 'Connect to an AI provider to access its models.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="connector-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="connector-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My OpenAI Connector"
            />
            {fieldErrors.name ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.name[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="connector-provider" className="text-sm font-medium">
              Provider
            </label>
            <Select
              value={provider ?? undefined}
              onValueChange={(value) => setProvider(value as ConnectorProvider)}
              disabled={isEditing}
            >
              <SelectTrigger id="connector-provider">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {CONNECTOR_PROVIDER_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_DISPLAY_NAMES[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.provider ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.provider[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="connector-auth" className="text-sm font-medium">
              Auth Type
            </label>
            <Select
              value={authType}
              onValueChange={(value) => setAuthType(value as ConnectorAuthType)}
            >
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
            {fieldErrors.authType ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.authType[0]}</p>
            ) : null}
          </div>

          {authType === ConnectorAuthType.API_KEY ? (
            <div className="grid gap-2">
              <label htmlFor="connector-api-key" className="text-sm font-medium">
                API Key
              </label>
              <Input
                id="connector-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isEditing ? 'Leave blank to keep current key' : 'sk-...'}
              />
              {fieldErrors.apiKey ? (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.apiKey[0]}</p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2">
            <label htmlFor="connector-base-url" className="text-sm font-medium">
              Base URL (optional)
            </label>
            <Input
              id="connector-base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com"
            />
            {fieldErrors.baseUrl ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.baseUrl[0]}</p>
            ) : null}
          </div>

          {provider === ConnectorProvider.AWS_BEDROCK ? (
            <div className="grid gap-2">
              <label htmlFor="connector-region" className="text-sm font-medium">
                Region
              </label>
              <Input
                id="connector-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="us-east-1"
              />
              {fieldErrors.region ? (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.region[0]}</p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
