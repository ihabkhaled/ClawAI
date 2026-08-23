import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SMART_ROUTER_BILLING_MODEL_LABEL_KEYS,
  SMART_ROUTER_BILLING_MODEL_OPTIONS,
  SMART_ROUTER_PROVIDER_LABEL_KEYS,
  SMART_ROUTER_PROVIDER_OPTIONS,
  SMART_ROUTER_ROLE_LABEL_KEYS,
  SMART_ROUTER_ROLE_OPTIONS,
} from '@/constants/smart-router-admin.constants';
import type {
  RouterChainEntryRole,
  RouterConfigurationBillingModel,
  RouterProvider,
} from '@/enums/router-configuration.enum';
import { useSmartRouterAddEntryForm } from '@/hooks/admin/use-smart-router-add-entry-form';
import type { SmartRouterAddEntryFormProps } from '@/types/smart-router-admin.types';

export function SmartRouterAddEntryForm({
  onAdd,
  isPending,
  t,
}: SmartRouterAddEntryFormProps): React.ReactElement {
  const {
    provider,
    setProvider,
    modelAlias,
    setModelAlias,
    role,
    setRole,
    billingModel,
    setBillingModel,
    deploymentId,
    setDeploymentId,
    attemptTimeoutMs,
    setAttemptTimeoutMs,
    retries,
    setRetries,
    triggers,
    setTriggers,
    fieldErrors,
    buildInput,
    reset,
  } = useSmartRouterAddEntryForm();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const input = buildInput();
    if (input === null) {
      return;
    }
    onAdd(input);
    reset();
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <p className="text-sm font-medium">{t('smartRouterAdmin.entryForm.addEntryTitle')}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="smart-router-entry-provider" className="text-sm font-medium">
                {t('smartRouterAdmin.entryForm.provider')}
              </label>
              <Select
                value={provider}
                onValueChange={(value: string) => setProvider(value as RouterProvider)}
              >
                <SelectTrigger id="smart-router-entry-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SMART_ROUTER_PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(SMART_ROUTER_PROVIDER_LABEL_KEYS[option])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="smart-router-entry-model-alias" className="text-sm font-medium">
                {t('smartRouterAdmin.entryForm.modelAlias')}
              </label>
              <Input
                id="smart-router-entry-model-alias"
                value={modelAlias}
                onChange={(event) => setModelAlias(event.target.value)}
                placeholder={t('smartRouterAdmin.entryForm.modelAliasPlaceholder')}
                aria-invalid={fieldErrors.modelAlias !== undefined}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="smart-router-entry-role" className="text-sm font-medium">
                {t('smartRouterAdmin.entryForm.role')}
              </label>
              <Select
                value={role}
                onValueChange={(value: string) => setRole(value as RouterChainEntryRole)}
              >
                <SelectTrigger id="smart-router-entry-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SMART_ROUTER_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(SMART_ROUTER_ROLE_LABEL_KEYS[option])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="smart-router-entry-billing-model" className="text-sm font-medium">
                {t('smartRouterAdmin.entryForm.billingModel')}
              </label>
              <Select
                value={billingModel}
                onValueChange={(value: string) =>
                  setBillingModel(value as RouterConfigurationBillingModel)
                }
              >
                <SelectTrigger id="smart-router-entry-billing-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SMART_ROUTER_BILLING_MODEL_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(SMART_ROUTER_BILLING_MODEL_LABEL_KEYS[option])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="smart-router-entry-deployment-id" className="text-sm font-medium">
                {t('smartRouterAdmin.entryForm.deploymentId')}
              </label>
              <Input
                id="smart-router-entry-deployment-id"
                value={deploymentId}
                onChange={(event) => setDeploymentId(event.target.value)}
                placeholder={t('smartRouterAdmin.entryForm.deploymentIdPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="smart-router-entry-timeout" className="text-sm font-medium">
                {t('smartRouterAdmin.entryForm.attemptTimeoutMs')}
              </label>
              <Input
                id="smart-router-entry-timeout"
                type="number"
                min={100}
                max={600_000}
                value={attemptTimeoutMs}
                onChange={(event) => setAttemptTimeoutMs(Number(event.target.value))}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="smart-router-entry-retries" className="text-sm font-medium">
                {t('smartRouterAdmin.entryForm.retries')}
              </label>
              <Input
                id="smart-router-entry-retries"
                type="number"
                min={0}
                max={10}
                value={retries}
                onChange={(event) => setRetries(Number(event.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="smart-router-entry-triggers" className="text-sm font-medium">
              {t('smartRouterAdmin.entryForm.triggers')}
            </label>
            <Input
              id="smart-router-entry-triggers"
              value={triggers}
              onChange={(event) => setTriggers(event.target.value)}
              placeholder={t('smartRouterAdmin.entryForm.triggersPlaceholder')}
            />
          </div>
          {fieldErrors.modelAlias !== undefined ? (
            <p className="text-destructive text-xs">
              {t('smartRouterAdmin.entryForm.validationError')}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {t('smartRouterAdmin.entryForm.submit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
