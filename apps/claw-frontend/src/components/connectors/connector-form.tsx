import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUTH_TYPE_LABELS,
  PROVIDER_DISPLAY_NAMES,
} from "@/constants";
import { ConnectorProvider } from "@/enums";
import type { Connector, CreateConnectorRequest } from "@/types";

type ConnectorFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateConnectorRequest) => void;
  isPending: boolean;
  connector?: Connector | null;
};

const PROVIDER_OPTIONS = Object.values(ConnectorProvider);
const AUTH_TYPE_OPTIONS = Object.keys(AUTH_TYPE_LABELS);

export function ConnectorForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  connector,
}: ConnectorFormProps) {
  const [name, setName] = useState(connector?.name ?? "");
  const [provider, setProvider] = useState<ConnectorProvider | "">(
    connector?.provider ?? "",
  );
  const [authType, setAuthType] = useState(connector?.authType ?? "api_key");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(connector?.baseUrl ?? "");
  const [region, setRegion] = useState(connector?.region ?? "");

  const isEditing = !!connector;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;

    const data: CreateConnectorRequest = {
      name,
      provider,
      authType,
    };
    if (apiKey) data.apiKey = apiKey;
    if (baseUrl) data.baseUrl = baseUrl;
    if (region) data.region = region;

    onSubmit(data);
  };

  const isValid = name.trim().length > 0 && !!provider;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Connector" : "Add Connector"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your connector configuration."
              : "Connect to an AI provider to access its models."}
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
          </div>

          <div className="grid gap-2">
            <label htmlFor="connector-provider" className="text-sm font-medium">
              Provider
            </label>
            <Select
              value={provider}
              onValueChange={(value) =>
                setProvider(value as ConnectorProvider)
              }
              disabled={isEditing}
            >
              <SelectTrigger id="connector-provider">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_DISPLAY_NAMES[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="connector-auth" className="text-sm font-medium">
              Auth Type
            </label>
            <Select value={authType} onValueChange={setAuthType}>
              <SelectTrigger id="connector-auth">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTH_TYPE_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {AUTH_TYPE_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {authType === "api_key" ? (
            <div className="grid gap-2">
              <label htmlFor="connector-api-key" className="text-sm font-medium">
                API Key
              </label>
              <Input
                id="connector-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isEditing ? "Leave blank to keep current key" : "sk-..."}
              />
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
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Connector"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
