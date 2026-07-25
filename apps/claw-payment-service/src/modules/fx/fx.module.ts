import { Module } from '@nestjs/common';

import { FxQuoteRepository } from './repositories/fx-quote.repository';
import { FxService } from './services/fx.service';

// FX quoting is separated from the gateways because the rate is ours, not the
// provider's: the EGP total is computed server-side and bound to the checkout
// session before Paymob is ever contacted.
@Module({
  providers: [FxService, FxQuoteRepository],
  exports: [FxService],
})
export class FxModule {}
