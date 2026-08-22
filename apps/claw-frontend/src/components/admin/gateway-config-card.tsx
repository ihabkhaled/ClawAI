'use client';

import type { ReactElement } from 'react';

import { PasswordInput } from '@/components/common/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  GATEWAY_CREDENTIAL_LABEL_KEYS,
  GENERIC_GATEWAY_CREDENTIAL_LABEL_KEY,
} from '@/constants/gateway-config.constants';
import { useGatewayConfigForm } from '@/hooks/admin/use-gateway-config-form';
import type { GatewayConfigCardProps } from '@/types/gateway-config.types';

export function GatewayConfigCard({
  gateway,
  isSaving,
  onSave,
  t,
}: GatewayConfigCardProps): ReactElement {
  const form = useGatewayConfigForm(gateway, onSave);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{gateway.gateway}</CardTitle>
          <Switch
            checked={form.state.isEnabled}
            onCheckedChange={form.setEnabled}
            aria-label={t('adminGatewayConfig.enabled')}
          />
        </div>
        <CardDescription>{t('adminGatewayConfig.secretHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="text-sm font-medium">{t('adminGatewayConfig.mode')}</label>
        <Input value={form.state.mode} onChange={(event) => form.setMode(event.target.value)} />
        {gateway.fields.map((field) => (
          <div className="space-y-2" key={field.key}>
            <label className="text-sm font-medium" htmlFor={`${gateway.gateway}-${field.key}`}>
              {t(GATEWAY_CREDENTIAL_LABEL_KEYS[field.key] ?? GENERIC_GATEWAY_CREDENTIAL_LABEL_KEY)}
            </label>
            <PasswordInput
              id={`${gateway.gateway}-${field.key}`}
              autoComplete="new-password"
              value={form.state.credentials[field.key] ?? ''}
              placeholder={
                field.configured
                  ? t('adminGatewayConfig.configured')
                  : t('adminGatewayConfig.notConfigured')
              }
              onChange={(event) => form.setCredential(field.key, event.target.value)}
            />
          </div>
        ))}
        <label className="text-sm font-medium">{t('adminGatewayConfig.currency')}</label>
        <Input
          maxLength={3}
          value={form.state.currency}
          onChange={(event) => form.setCurrency(event.target.value.toUpperCase())}
        />
        <label className="text-sm font-medium">{t('adminGatewayConfig.webhookUrl')}</label>
        <Input
          type="url"
          value={form.state.webhookUrl}
          onChange={(event) => form.setWebhookUrl(event.target.value)}
        />
        <Button disabled={isSaving} onClick={form.submit}>
          {isSaving ? t('adminGatewayConfig.saving') : t('adminGatewayConfig.save')}
        </Button>
      </CardContent>
    </Card>
  );
}
