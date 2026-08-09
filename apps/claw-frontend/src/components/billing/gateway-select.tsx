import type { ReactElement } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BillingGateway } from '@/enums/billing.enum';
import type { GatewaySelectProps } from '@/types/billing-component.types';
import { parseBillingGateway } from '@/utilities/billing.utility';

export function GatewaySelect({
  value,
  onChange,
  disabled,
  gateways,
  t,
}: GatewaySelectProps): ReactElement {
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
          {gateways.map((gateway) => (
            <SelectItem
              key={gateway.gateway}
              value={gateway.gateway}
              disabled={gateway.testingSoon}
            >
              {gateway.gateway === BillingGateway.PAYPAL
                ? t('billing.gateway.paypalCard')
                : t('billing.gateway.paymobTestingSoon')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
