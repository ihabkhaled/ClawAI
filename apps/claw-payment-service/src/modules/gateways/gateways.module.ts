import { Module } from '@nestjs/common';

import { PaypalAdapter } from './paypal/paypal.adapter';
import { PaypalTokenManager } from './paypal/managers/paypal-token.manager';

// Gateway adapters are the only files permitted to make provider HTTP calls.
// Exporting the adapters (and not the token manager's internals) keeps that
// boundary enforceable: a service that wants to reach PayPal has to go through
// PaypalAdapter, where response validation and amount verification live.
@Module({
  providers: [PaypalAdapter, PaypalTokenManager],
  exports: [PaypalAdapter],
})
export class GatewaysModule {}
