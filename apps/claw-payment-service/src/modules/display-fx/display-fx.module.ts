import { Module } from '@nestjs/common';

import { RedisModule } from '../../infrastructure/redis/redis.module';
import { PublicDisplayCurrencyController } from './controllers/public-display-currency.controller';
import { FawazExchangeProvider } from './providers/fawaz-exchange.provider';
import { FrankfurterProvider } from './providers/frankfurter.provider';
import { DisplayCurrencyService } from './services/display-currency.service';
import { DisplayFxService } from './services/display-fx.service';
import { GeoCountryService } from './services/geo-country.service';

// DISPLAY FX. Separate from `modules/fx`, which settles charges, and the
// separation is the architecture - see ADR-097.
//
// Nothing here is exported to a checkout, a gateway or an invoice path. If a
// future module needs to import DisplayFxService, that is the moment to ask
// whether it is about to show a number or charge one.
@Module({
  imports: [RedisModule],
  controllers: [PublicDisplayCurrencyController],
  providers: [
    FrankfurterProvider,
    FawazExchangeProvider,
    DisplayFxService,
    GeoCountryService,
    DisplayCurrencyService,
  ],
  exports: [DisplayCurrencyService, DisplayFxService],
})
export class DisplayFxModule {}
