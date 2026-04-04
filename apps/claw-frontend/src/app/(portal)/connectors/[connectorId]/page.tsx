"use client";

import {
  Activity,
  ArrowLeft,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ConnectorForm } from "@/components/connectors/connector-form";
import { ModelTable } from "@/components/connectors/model-table";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AUTH_TYPE_LABELS,
  PROVIDER_DISPLAY_NAMES,
  PROVIDER_ICON_COLORS,
  ROUTES,
} from "@/constants";
import { cn } from "@/lib/utils";
import { useConnectorDetailPage } from "@/hooks/connectors/use-connector-detail-page";

export default function ConnectorDetailPage() {
  const params = useParams<{ connectorId: string }>();
  const connectorId = params.connectorId ?? "";

  const {
    connector,
    models,
    isLoadingConnector,
    isLoadingModels,
    isError,
    error,
    isFormOpen,
    setIsFormOpen,
    handleOpenEdit,
    handleFormSubmit,
    isFormPending,
    deleteConnector,
    isDeletePending,
    testConnector,
    isTestPending,
    testResult,
    syncModels,
    isSyncPending,
    syncResult,
  } = useConnectorDetailPage(connectorId);

  if (!connectorId || isLoadingConnector) {
    return <LoadingSpinner label="Loading connector..." />;
  }

  if (isError || !connector) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title="Connector Detail"
          description="Connector not found"
          actions={
            <Button variant="outline" asChild>
              <Link href={ROUTES.CONNECTORS}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to connectors
              </Link>
            </Button>
          }
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error?.message ?? "Failed to load connector."}
          </p>
        </div>
      </div>
    );
  }

  const providerColor =
    PROVIDER_ICON_COLORS[connector.provider] ?? "bg-slate-100 text-slate-700";
  const providerName =
    PROVIDER_DISPLAY_NAMES[connector.provider] ?? connector.provider;

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={connector.name}
        description={providerName}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => testConnector(connector.id)}
              disabled={isTestPending}
            >
              <Activity className="mr-2 h-4 w-4" />
              {isTestPending ? "Testing..." : "Test"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncModels(connector.id)}
              disabled={isSyncPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {isSyncPending ? "Syncing..." : "Sync Models"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConnector(connector.id)}
              disabled={isDeletePending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={ROUTES.CONNECTORS}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            providerColor,
          )}
        >
          <span className="text-sm font-bold">
            {providerName.charAt(0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={connector.status} />
          {connector.isEnabled ? (
            <Badge variant="secondary" className="text-xs">
              Enabled
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Disabled
            </Badge>
          )}
        </div>
      </div>

      {testResult ? (
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <StatusBadge status={testResult.status} />
            <span className="text-sm text-muted-foreground">
              Latency: {testResult.latencyMs}ms
            </span>
            {testResult.errorMessage ? (
              <span className="text-sm text-destructive">
                {testResult.errorMessage}
              </span>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {syncResult ? (
        <Card>
          <CardContent className="flex items-center gap-4 pt-6 text-sm text-muted-foreground">
            <span>Models found: {syncResult.modelsFound}</span>
            <span>Added: {syncResult.modelsAdded}</span>
            <span>Removed: {syncResult.modelsRemoved}</span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium">{providerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auth Type</span>
              <span className="font-medium">
                {AUTH_TYPE_LABELS[connector.authType] ?? connector.authType}
              </span>
            </div>
            {connector.maskedApiKey ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Key</span>
                <span className="font-mono text-xs">
                  {connector.maskedApiKey}
                </span>
              </div>
            ) : null}
            {connector.baseUrl ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base URL</span>
                <span className="font-mono text-xs">{connector.baseUrl}</span>
              </div>
            ) : null}
            {connector.region ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region</span>
                <span className="font-medium">{connector.region}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Health History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Health history tracking will be available in a future update.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Models ({models.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingModels ? (
            <LoadingSpinner label="Loading models..." />
          ) : (
            <ModelTable models={models} />
          )}
        </CardContent>
      </Card>

      <ConnectorForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        isPending={isFormPending}
        connector={connector}
      />
    </div>
  );
}
