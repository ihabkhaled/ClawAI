'use client';

import { Activity, ArrowLeft, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { ConnectorForm } from '@/components/connectors/connector-form';
import { ModelTable } from '@/components/connectors/model-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AUTH_TYPE_LABELS,
  PROVIDER_DISPLAY_NAMES,
  PROVIDER_ICON_COLORS,
  ROUTES,
} from '@/constants';
import { useConnectorDetailPage } from '@/hooks/connectors/use-connector-detail-page';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function ConnectorDetailPage() {
  const params = useParams<{ connectorId: string }>();
  const connectorId = params.connectorId ?? '';

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

  const { t } = useTranslation();

  if (!connectorId || isLoadingConnector) {
    return <LoadingSpinner label={t('connectors.loadingConnector')} />;
  }

  if (isError || !connector) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title={t('connectors.connectorDetail')}
          description={t('connectors.connectorNotFound')}
          actions={
            <Button variant="outline" asChild>
              <Link href={ROUTES.CONNECTORS}>
                <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
                {t('connectors.backToConnectors')}
              </Link>
            </Button>
          }
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error?.message ?? t('connectors.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  const providerColor = PROVIDER_ICON_COLORS[connector.provider] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
  const providerName = PROVIDER_DISPLAY_NAMES[connector.provider] ?? connector.provider;

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
              <Activity className="me-2 h-4 w-4" />
              {isTestPending ? t('connectors.testingConnection') : t('connectors.testConnection')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncModels(connector.id)}
              disabled={isSyncPending}
            >
              <RefreshCw className="me-2 h-4 w-4" />
              {isSyncPending ? t('connectors.syncing') : t('connectors.syncModels')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenEdit}>
              <Pencil className="me-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConnector(connector.id)}
              disabled={isDeletePending}
            >
              <Trash2 className="me-2 h-4 w-4" />
              {t('common.delete')}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={ROUTES.CONNECTORS}>
                <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
                {t('common.back')}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', providerColor)}>
          <span className="text-sm font-bold">{providerName.charAt(0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={connector.status} />
          {connector.isEnabled ? (
            <Badge variant="secondary" className="text-xs">
              {t('connectors.enabled')}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {t('connectors.disabled')}
            </Badge>
          )}
        </div>
      </div>

      {testResult ? (
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <StatusBadge status={testResult.status} />
            <span className="text-sm text-muted-foreground">Latency: {testResult.latencyMs}ms</span>
            {testResult.errorMessage ? (
              <span className="text-sm text-destructive">{testResult.errorMessage}</span>
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
            <CardTitle className="text-lg">{t('connectors.configuration')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('connectors.provider')}</span>
              <span className="font-medium">{providerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('connectors.authType')}</span>
              <span className="font-medium">
                {AUTH_TYPE_LABELS[connector.authType] ?? connector.authType}
              </span>
            </div>
            {connector.maskedApiKey ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('connectors.apiKey')}</span>
                <span className="font-mono text-xs">{connector.maskedApiKey}</span>
              </div>
            ) : null}
            {connector.baseUrl ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('connectors.baseUrl')}</span>
                <span className="font-mono text-xs">{connector.baseUrl}</span>
              </div>
            ) : null}
            {connector.region ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('connectors.region')}</span>
                <span className="font-medium">{connector.region}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('connectors.healthHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('connectors.healthHistoryDesc')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('connectors.models')} ({models.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingModels ? (
            <LoadingSpinner label={t('models.loadingModels')} />
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
