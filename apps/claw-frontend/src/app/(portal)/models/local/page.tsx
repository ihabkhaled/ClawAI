'use client';

import { Download, HardDrive, Activity } from 'lucide-react';

import { DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RUNTIME_TYPE_LABELS, MODEL_ROLE_LABELS, MODEL_ROLES } from '@/constants';
import { useLocalModelsPage } from '@/hooks/ollama/use-local-models-page';
import { cn } from '@/lib/utils';
import type { DataTableColumn, LocalModel } from '@/types';
import { formatBytes, getHealthStatusColor } from '@/utilities';

export default function LocalModelsPage(): React.ReactElement {
  const {
    models,
    isLoading,
    isError,
    error,
    runtimes,
    isRuntimesLoading,
    healthStatus,
    healthRuntime,
    healthLatency,
    pullModelName,
    setPullModelName,
    pullRuntime,
    setPullRuntime,
    handlePullModel,
    isPullPending,
    pullFieldErrors,
    clearPullFieldErrors,
    handleAssignRole,
    isAssignPending,
  } = useLocalModelsPage();

  const columns: DataTableColumn<LocalModel>[] = [
    {
      key: 'name',
      header: 'Model',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.name}</span>
          <span className="text-xs text-muted-foreground">{row.tag}</span>
        </div>
      ),
    },
    {
      key: 'runtime',
      header: 'Runtime',
      render: (row) => (
        <Badge variant="outline">{RUNTIME_TYPE_LABELS[row.runtime] ?? row.runtime}</Badge>
      ),
    },
    {
      key: 'size',
      header: 'Size',
      render: (row) => <span className="tabular-nums">{formatBytes(row.sizeBytes)}</span>,
    },
    {
      key: 'family',
      header: 'Family',
      render: (row) => <span className="text-muted-foreground">{row.family ?? 'N/A'}</span>,
    },
    {
      key: 'parameters',
      header: 'Parameters',
      render: (row) => (
        <span className="tabular-nums text-muted-foreground">{row.parameters ?? 'N/A'}</span>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles
            .filter((r) => r.isActive)
            .map((r) => (
              <Badge key={r.role} variant="secondary" className="text-xs">
                {MODEL_ROLE_LABELS[r.role] ?? r.role}
              </Badge>
            ))}
          {row.roles.filter((r) => r.isActive).length === 0 ? (
            <span className="text-xs text-muted-foreground">None</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (row) => (
        <Select onValueChange={(role) => handleAssignRole(row.id, role)} disabled={isAssignPending}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Assign role" />
          </SelectTrigger>
          <SelectContent>
            {MODEL_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {MODEL_ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title="Local Models"
          description="Manage locally installed AI models and runtime environments"
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error?.message ?? 'Failed to load local models.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Local Models"
        description="Manage locally installed AI models and runtime environments"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Runtime Health
            </CardTitle>
            <CardDescription>Current status of the local model runtime</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={cn('h-3 w-3 rounded-full', getHealthStatusColor(healthStatus))} />
              <div className="flex flex-col">
                <span className="text-sm font-medium capitalize">{healthStatus ?? 'Unknown'}</span>
                {healthRuntime ? (
                  <span className="text-xs text-muted-foreground">
                    {RUNTIME_TYPE_LABELS[healthRuntime] ?? healthRuntime}
                    {healthLatency !== null ? ` - ${healthLatency}ms` : ''}
                  </span>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" />
              Pull Model
            </CardTitle>
            <CardDescription>Download a new model from the registry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <label htmlFor="pull-model-name" className="text-sm font-medium">
                  Model Name
                </label>
                <Input
                  id="pull-model-name"
                  value={pullModelName}
                  onChange={(e) => {
                    setPullModelName(e.target.value);
                    clearPullFieldErrors();
                  }}
                  placeholder="llama3:8b"
                />
                {pullFieldErrors.modelName && (
                  <p className="mt-1 text-sm text-destructive">{pullFieldErrors.modelName[0]}</p>
                )}
              </div>
              <div className="w-[160px] space-y-2">
                <label htmlFor="pull-model-runtime" className="text-sm font-medium">
                  Runtime
                </label>
                <Select
                  value={pullRuntime}
                  onValueChange={(value) => {
                    setPullRuntime(value);
                    clearPullFieldErrors();
                  }}
                >
                  <SelectTrigger id="pull-model-runtime">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {isRuntimesLoading ? (
                      <SelectItem value="__loading__" disabled>
                        Loading...
                      </SelectItem>
                    ) : (
                      runtimes.map((rt) => (
                        <SelectItem key={rt} value={rt}>
                          {RUNTIME_TYPE_LABELS[rt] ?? rt}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {pullFieldErrors.runtime && (
                  <p className="mt-1 text-sm text-destructive">{pullFieldErrors.runtime[0]}</p>
                )}
              </div>
              <Button onClick={handlePullModel} disabled={isPullPending}>
                {isPullPending ? 'Pulling...' : 'Pull'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Installed Models</h2>
        {isLoading && <LoadingSpinner label="Loading local models..." />}

        {!isLoading && models.length === 0 && (
          <EmptyState
            icon={HardDrive}
            title="No local models installed"
            description="Pull a model using the form above to get started with local inference."
          />
        )}

        {!isLoading && models.length > 0 && (
          <DataTable
            columns={columns}
            data={models}
            keyExtractor={(row) => row.id}
            emptyMessage="No local models installed."
          />
        )}
      </div>
    </div>
  );
}
