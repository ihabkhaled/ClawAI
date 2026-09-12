import { Controller, Get, Headers, Query } from '@nestjs/common';
import { Public } from '@claw/shared-auth';
import { type DisplayCurrencyContext } from '@claw/shared-types';

import {
  type DisplayCurrencyQueryDto,
  displayCurrencyQuerySchema,
} from '../dto/display-currency-query.dto';
import { DisplayCurrencyService } from '../services/display-currency.service';

// The public display-currency endpoint.
//
// Read-only, unauthenticated and deliberately narrow. It resolves the CURRENT
// request's context and nothing else: there is no `?ip=` parameter, because an
// endpoint that geolocates an arbitrary address is an open proxy that happens
// to live in a billing service.
//
// It is rate-limited at nginx and it never reveals the visitor's address, the
// proxy chain, an upstream URL or a cache state.
@Controller('billing/display-currency')
export class PublicDisplayCurrencyController {
  constructor(private readonly displayCurrency: DisplayCurrencyService) {}

  @Get()
  @Public()
  resolve(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query() query: DisplayCurrencyQueryDto,
  ): Promise<DisplayCurrencyContext> {
    const parsed = displayCurrencyQuerySchema.safeParse(query);
    // A malformed query is treated as no query. This endpoint decides which
    // currency symbol to print; refusing to answer would blank a pricing page
    // over a typo in a cookie.
    const input = parsed.success ? parsed.data : {};
    return this.displayCurrency.resolve({
      headers,
      anonymousCurrencyCode: input.currency ?? null,
      clientCountryHint: input.countryHint ?? null,
    });
  }
}
