'use client';

import { Plus, Route, Trash2, Pencil } from 'lucide-react';

import { RoutingBadge } from '@/components/chat/routing-badge';
import { DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { PolicyForm } from '@/components/routing/policy-form';
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
import { ROUTING_MODE_LABELS, ROUTING_MODE_OPTIONS } from '@/constants';
import { RoutingMode } from '@/enums';
import { useRoutingPage } from '@/hooks/routing/use-routing-page';
import { useTranslation } from '@/lib/i18n';
import type { DataTableColumn, RoutingPolicy } from '@/types';

export default function RoutingPage(): React.ReactElement {
  const { t } = useTranslation();
  const {
    policies,
    isLoading,
    isError,
    error,
    isFormOpen,
    setIsFormOpen,
    editingPolicy,
    handleOpenCreate,
    handleOpenEdit,
    handleFormSubmit,
    handleToggleActive,
    isFormPending,
    deletePolicy,
  } = useRoutingPage();

  const columnsWithActions: DataTableColumn<RoutingPolicy>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (row) => <RoutingBadge mode={row.routingMode} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => <span className="tabular-nums">{row.priority}</span>,
    },
    {
      key: 'active',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isActive ? 'default' : 'secondary'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-end',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(row)}>
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => deletePolicy(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title={t('routing.title')}
          description={t('routing.description')}
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error?.message ?? 'Failed to load routing configuration.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('routing.title')}
        description={t('routing.description')}
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="me-2 h-4 w-4" />
            Create Policy
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Default Routing Mode</CardTitle>
            <CardDescription>
              Choose how the local router distributes requests across models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="routing-default-mode" className="text-sm font-medium">
                Default Mode
              </label>
              <Select defaultValue={RoutingMode.AUTO}>
                <SelectTrigger id="routing-default-mode">
                  <SelectValue placeholder="Select routing mode" />
                </SelectTrigger>
                <SelectContent>
                  {ROUTING_MODE_OPTIONS.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {ROUTING_MODE_LABELS[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fallback Settings</CardTitle>
            <CardDescription>Configure retry and timeout behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="routing-max-retries" className="text-sm font-medium">
                Max Retries
              </label>
              <Input id="routing-max-retries" type="number" defaultValue={3} min={0} max={10} />
            </div>
            <div className="space-y-2">
              <label htmlFor="routing-timeout" className="text-sm font-medium">
                Timeout (ms)
              </label>
              <Input
                id="routing-timeout"
                type="number"
                defaultValue={30000}
                min={1000}
                step={1000}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Routing Policies</h2>
        {isLoading && <LoadingSpinner label="Loading policies..." />}

        {!isLoading && policies.length === 0 && (
          <EmptyState
            icon={Route}
            title="No routing policies"
            description="Create routing policies to control how requests are distributed across models and providers."
            action={
              <Button onClick={handleOpenCreate}>
                <Plus className="me-2 h-4 w-4" />
                Create Policy
              </Button>
            }
          />
        )}

        {!isLoading && policies.length > 0 && (
          <DataTable
            columns={columnsWithActions}
            data={policies}
            keyExtractor={(row) => row.id}
            emptyMessage="No routing policies configured."
          />
        )}
      </div>

      <PolicyForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        isPending={isFormPending}
        policy={editingPolicy}
      />
    </div>
  );
}
