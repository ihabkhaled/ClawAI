import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import { type AuthenticatedUser, Permission } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type CheckoutSessionParamDto, checkoutSessionParamSchema } from '../dto/checkout.dto';
import {
  type CreateCreditTopupSessionDto,
  createCreditTopupSessionSchema,
} from '../dto/credit-topup.dto';
import { CreditTopupCheckoutService } from '../services/credit-topup-checkout.service';
import { type CreditTopupSessionView } from '../types/credit-topup.types';
import { type CreditPackageVersionView } from '../../plan-catalog/types/plan-catalog.types';

/**
 * Buying PAYG credit.
 *
 * Lives under the EXISTING `/billing` base that nginx already proxies to this
 * service — a top-up needs no new location, and inventing one would put a money
 * path behind a route nobody had reviewed.
 *
 * The identity always comes from the verified JWT via `@CurrentUser`, never
 * from the request body, and the whole controller is gated on
 * `BILLING_CREDIT_TOPUP`: the package list IS the purchase entry point, so a
 * role that may not buy credit has no business being shown prices either.
 *
 * There is deliberately NO completion route here. A top-up settles through the
 * EXISTING `POST /billing/checkout-sessions/:id/complete-paypal`,
 * `…/complete-paypal-sdk` and `…/complete-paymob`, which are purpose-agnostic
 * and already enforce ownership, the state nonce and the provider-order
 * binding. A second door onto the same capture would be redundant surface on a
 * money path, and the real controls are those bindings rather than the route.
 */
@Controller('billing/credit-topup')
@RequirePermissions(Permission.BILLING_CREDIT_TOPUP)
export class CreditTopupController {
  constructor(private readonly topups: CreditTopupCheckoutService) {}

  @Get('packages')
  async listPackages(): Promise<CreditPackageVersionView[]> {
    return this.topups.listPackages();
  }

  @Post('checkout-sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCreditTopupSessionSchema)) dto: CreateCreditTopupSessionDto,
  ): Promise<CreditTopupSessionView> {
    return this.topups.start({
      userId: user.id,
      userEmail: user.email,
      packageId: dto.packageId,
      gateway: dto.gateway,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Get('checkout-sessions/:id')
  async getSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(checkoutSessionParamSchema)) params: CheckoutSessionParamDto,
  ): Promise<CreditTopupSessionView> {
    return this.topups.findOwned(user.id, params.id);
  }
}
