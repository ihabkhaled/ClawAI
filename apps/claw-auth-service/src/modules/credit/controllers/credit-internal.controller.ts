import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  type CreditPackageView,
  type PaygFinalizeOutcome,
  type PaygReservationOutcome,
  type PaygWalletSnapshot,
} from '@claw/shared-types';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CreditPackageParamDto,
  creditPackageParamSchema,
  type CreditWalletParamDto,
  creditWalletParamSchema,
  type FinalizeCreditDto,
  finalizeCreditSchema,
  type ReleaseCreditDto,
  releaseCreditSchema,
  type ReserveCreditDto,
  reserveCreditSchema,
} from '../dto/credit-internal.dto';
import { CreditReservationManager } from '../managers/credit-reservation.manager';
import { CreditAccountService } from '../services/credit-account.service';
import { CreditPackageService } from '../services/credit-package.service';
import { toCreditFinalizeInput, toCreditReserveInput } from '../utilities/credit-request.utility';

/**
 * The four internal routes every metered provider call goes through.
 *
 * `@Public()` removes the user-JWT requirement — the caller is a service acting
 * on a user's behalf — and `ServiceTokenGuard` then requires the shared
 * inter-service secret. Together that is service-authenticated, not
 * unauthenticated: these endpoints MOVE MONEY and deliberately do NOT inherit
 * the older `internal/quota` shape, which is `@Public()` with no guard at all.
 * Not routed through nginx.
 */
@Controller('internal/credit')
@Public()
@UseGuards(ServiceTokenGuard)
export class CreditInternalController {
  constructor(
    private readonly reservations: CreditReservationManager,
    private readonly accounts: CreditAccountService,
    private readonly packages: CreditPackageService,
  ) {}

  @Post('reserve')
  @HttpCode(HttpStatus.OK)
  async reserve(
    @Body(new ZodValidationPipe(reserveCreditSchema)) dto: ReserveCreditDto,
  ): Promise<PaygReservationOutcome> {
    return this.reservations.reserve(toCreditReserveInput(dto));
  }

  // 200 even for an unknown reservation (`settled: false`). The user already has
  // their answer, and a finalize failure must never surface to them as a failed
  // request. This answered 204 with no body until F108; the reply is purely
  // additive, so a caller that ignores it (including the old PaygMeter, which
  // only reads a body when the status is not 204) is unaffected. The settled
  // cost is inside it for a PAYG user only - see CreditReservationManager.finalize.
  @Post('finalize')
  @HttpCode(HttpStatus.OK)
  async finalize(
    @Body(new ZodValidationPipe(finalizeCreditSchema)) dto: FinalizeCreditDto,
  ): Promise<PaygFinalizeOutcome> {
    return this.reservations.finalize(toCreditFinalizeInput(dto));
  }

  @Post('release')
  @HttpCode(HttpStatus.NO_CONTENT)
  async release(
    @Body(new ZodValidationPipe(releaseCreditSchema)) dto: ReleaseCreditDto,
  ): Promise<void> {
    await this.reservations.release(dto.reservationId, dto.reason);
  }

  @Get('wallet/:userId')
  async wallet(
    @Param(new ZodValidationPipe(creditWalletParamSchema)) params: CreditWalletParamDto,
  ): Promise<PaygWalletSnapshot> {
    return this.accounts.getWallet(params.userId);
  }

  // The purchasable catalog, for payment-service to render one checkout origin.
  // Service-authenticated rather than public: the same list is already exposed
  // to a signed-in user at `GET /credit/packages`, and duplicating it without
  // the guard would give the price list a second, weaker door.
  @Get('packages')
  async listPackages(): Promise<CreditPackageView[]> {
    return this.packages.listPurchasable();
  }

  // The server-pricing chokepoint for a top-up checkout. payment-service names
  // a package id and reads the immutable priced version back from here — which
  // is why no request shape anywhere in the top-up flow carries an amount.
  @Get('packages/:id/active-version')
  async activePackageVersion(
    @Param(new ZodValidationPipe(creditPackageParamSchema)) params: CreditPackageParamDto,
  ): Promise<CreditPackageView> {
    return this.packages.requirePurchasable(params.id);
  }
}
