import type { ReactElement } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BILLING_GATEWAY_ORDER } from '@/constants/billing.constants';
import type { GatewaySelectProps } from '@/types/billing-component.types';
import { parseBillingGateway } from '@/utilities/billing.utility';

export function GatewaySelect({ value, onChange, disabled, t }: GatewaySelectProps): ReactElement {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium" htmlFor="billing-gateway">
        {t('billing.gateway.label')}
      </label>
      <Select
        value={value}
        onValueChange={(next: string) => {
          const parsed = parseBillingGateway(next);
          if (parsed !== null) {
            onChange(parsed);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger id="billing-gateway">
          <SelectValue placeholder={t('billing.gateway.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {BILLING_GATEWAY_ORDER.map((gateway) => (
            <SelectItem key={gateway} value={gateway}>
              {t(`billing.gateway.${gateway}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
