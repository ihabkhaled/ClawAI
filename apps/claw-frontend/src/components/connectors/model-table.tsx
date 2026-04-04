import { DataTable } from "@/components/common/data-table";
import { Badge } from "@/components/ui/badge";
import {
  LIFECYCLE_LABELS,
  PROVIDER_DISPLAY_NAMES,
} from "@/constants";
import type { DataTableColumn } from "@/types";
import type { ConnectorModel } from "@/types";

type ModelTableProps = {
  models: ConnectorModel[];
  showProvider?: boolean;
  emptyMessage?: string;
};

function formatContextTokens(tokens: number | null): string {
  if (tokens === null) return "-";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return String(tokens);
}

function getLifecycleBadgeVariant(
  lifecycle: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (lifecycle) {
    case "ga":
      return "default";
    case "preview":
    case "beta":
      return "secondary";
    case "deprecated":
      return "destructive";
    default:
      return "outline";
  }
}

export function ModelTable({
  models,
  showProvider = false,
  emptyMessage = "No models synced yet.",
}: ModelTableProps) {
  const columns: DataTableColumn<ConnectorModel>[] = [
    {
      key: "displayName",
      header: "Model",
      render: (model) => (
        <div>
          <span className="font-medium">{model.displayName}</span>
          <p className="text-xs text-muted-foreground">{model.modelKey}</p>
        </div>
      ),
    },
  ];

  if (showProvider) {
    columns.push({
      key: "provider",
      header: "Provider",
      render: (model) => (
        <span className="text-sm">
          {PROVIDER_DISPLAY_NAMES[model.provider] ?? model.provider}
        </span>
      ),
    });
  }

  columns.push(
    {
      key: "lifecycle",
      header: "Lifecycle",
      render: (model) => (
        <Badge variant={getLifecycleBadgeVariant(model.lifecycle)}>
          {LIFECYCLE_LABELS[model.lifecycle] ?? model.lifecycle}
        </Badge>
      ),
    },
    {
      key: "capabilities",
      header: "Capabilities",
      render: (model) => (
        <div className="flex flex-wrap gap-1">
          {model.supportsStreaming ? (
            <Badge variant="outline" className="text-xs">
              Streaming
            </Badge>
          ) : null}
          {model.supportsTools ? (
            <Badge variant="outline" className="text-xs">
              Tools
            </Badge>
          ) : null}
          {model.supportsVision ? (
            <Badge variant="outline" className="text-xs">
              Vision
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "context",
      header: "Context",
      className: "text-right",
      render: (model) => (
        <span className="text-sm text-muted-foreground">
          {formatContextTokens(model.maxContextTokens)}
        </span>
      ),
    },
  );

  return (
    <DataTable
      columns={columns}
      data={models}
      keyExtractor={(model) => model.id}
      emptyMessage={emptyMessage}
    />
  );
}
