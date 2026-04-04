"use client";

import { Cpu } from "lucide-react";

import { ModelTable } from "@/components/connectors/model-table";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PageHeader } from "@/components/common/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LIFECYCLE_LABELS,
  PROVIDER_DISPLAY_NAMES,
} from "@/constants";
import { ConnectorProvider } from "@/enums";
import { useAllModels } from "@/hooks/connectors/use-all-models";

const ALL_VALUE = "__all__";
const PROVIDER_OPTIONS = Object.values(ConnectorProvider);
const LIFECYCLE_OPTIONS = Object.keys(LIFECYCLE_LABELS);

export default function ModelsPage() {
  const {
    models,
    totalModels,
    isLoading,
    isError,
    providerFilter,
    setProviderFilter,
    lifecycleFilter,
    setLifecycleFilter,
  } = useAllModels();

  if (isError) {
    return (
      <div>
        <PageHeader
          title="Models"
          description="Browse and manage available AI models across all connectors"
        />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-destructive">
            Failed to load models.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Models"
        description={`Browse and manage available AI models across all connectors (${totalModels} total)`}
      />

      {isLoading ? (
        <LoadingSpinner label="Loading models..." />
      ) : totalModels === 0 ? (
        <EmptyState
          icon={Cpu}
          title="No models synced"
          description="Models will appear here once you configure a connector and sync its available models."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Select
              value={providerFilter || ALL_VALUE}
              onValueChange={(value) =>
                setProviderFilter(
                  value === ALL_VALUE ? "" : (value as ConnectorProvider),
                )
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All providers</SelectItem>
                {PROVIDER_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_DISPLAY_NAMES[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={lifecycleFilter || ALL_VALUE}
              onValueChange={(value) =>
                setLifecycleFilter(value === ALL_VALUE ? "" : value)
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All lifecycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All lifecycle</SelectItem>
                {LIFECYCLE_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {LIFECYCLE_LABELS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ModelTable
            models={models}
            showProvider
            emptyMessage="No models match the current filters."
          />
        </div>
      )}
    </div>
  );
}
