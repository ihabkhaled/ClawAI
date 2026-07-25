import type { BillingGateway } from '@claw/shared-types';

// Which gateways are fully configured. Reports configuration only — never a
// credential, and never whether a specific key is valid, which would let an
// unauthenticated caller probe the merchant setup.
export type GatewayReadiness = {
  gateway: BillingGateway;
  configured: boolean;
  // 'sandbox' | 'live' for PayPal; the settlement currency for Paymob.
  mode: string;
};

export type HealthReport = {
  status: string;
  service: string;
  database: string;
  gateways: GatewayReadiness[];
};
