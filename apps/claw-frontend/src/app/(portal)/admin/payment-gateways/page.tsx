'use client';

import type { ReactElement } from 'react';

import { GatewayConfigCard } from '@/components/admin/gateway-config-card';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { useAdminGatewayConfig } from '@/hooks/admin/use-admin-gateway-config';

export default function AdminPaymentGatewaysPage(): ReactElement {
  const controller = useAdminGatewayConfig();
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={controller.t('adminGatewayConfig.title')}
        description={controller.t('adminGatewayConfig.description')}
      />
      {controller.isLoading ? <p>{controller.t('adminGatewayConfig.loading')}</p> : null}
      {controller.isError ? (
        <div role="alert">
          <span>{controller.error?.message ?? controller.t('adminGatewayConfig.error')}</span>
          <Button onClick={controller.retry}>{controller.t('common.retry')}</Button>
        </div>
      ) : null}
      {!controller.isLoading && !controller.isError && controller.gateways.length === 0 ? (
        <p>{controller.t('adminGatewayConfig.empty')}</p>
      ) : null}
      {!controller.isLoading && !controller.isError ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {controller.gateways.map((gateway) => (
            <GatewayConfigCard
              key={gateway.gateway}
              gateway={gateway}
              isSaving={controller.savingGateway === gateway.gateway}
              onSave={controller.save}
              t={controller.t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
