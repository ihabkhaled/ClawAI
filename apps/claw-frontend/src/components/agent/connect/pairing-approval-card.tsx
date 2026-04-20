import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { PairingApprovalCardProps } from '@/types/device-component.types';

import { ScopeCheckboxList } from './scope-checkbox-list';

export function PairingApprovalCard({
  t,
  deviceName,
  setDeviceName,
  selectedScopes,
  setSelectedScopes,
  approve,
  deny,
  isBusy,
}: PairingApprovalCardProps): ReactElement {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>{t('agent.connect.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('agent.connect.approveDescription')}</p>
        <div>
          <label htmlFor="device-name" className="mb-2 block text-sm font-medium">
            {t('agent.connect.title')}
          </label>
          <Input
            id="device-name"
            value={deviceName}
            onChange={(event) => setDeviceName(event.target.value)}
            placeholder="my-laptop"
            disabled={isBusy}
          />
        </div>
        <div>
          <p className="mb-2 block text-sm font-medium">{t('agent.connect.scopesLabel')}</p>
          <ScopeCheckboxList
            value={selectedScopes}
            onChange={setSelectedScopes}
            disabled={isBusy}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="ghost" onClick={deny} disabled={isBusy}>
          {t('agent.connect.denyButton')}
        </Button>
        <Button onClick={approve} disabled={isBusy || selectedScopes.length === 0}>
          {t('agent.connect.approveButton')}
        </Button>
      </CardFooter>
    </Card>
  );
}
