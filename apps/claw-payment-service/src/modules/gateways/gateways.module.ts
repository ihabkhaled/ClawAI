import { Module } from '@nestjs/common';
import { GatewayConfigModule } from '../gateway-config/gateway-config.module';

import { PaymobAdapter } from './paymob/paymob.adapter';
import { PaymobTokenManager } from './paymob/managers/paymob-token.manager';
import { PaypalAdapter } from './paypal/paypal.adapter';
import { PaypalTokenManager } from './paypal/managers/paypal-token.manager';

// Gateway adapters are the only files permitted to make provider HTTP calls.
// Exporting the adapters (and not the token manager's internals) keeps that
// boundary enforceable: a service that wants to reach PayPal has to go through
// PaypalAdapter, where response validation and amount verification live.
@Module({
  imports: [GatewayConfigModule],
  providers: [PaypalAdapter, PaypalTokenManager, PaymobAdapter, PaymobTokenManager],
  exports: [PaypalAdapter, PaymobAdapter],
})
export class GatewaysModule {}
