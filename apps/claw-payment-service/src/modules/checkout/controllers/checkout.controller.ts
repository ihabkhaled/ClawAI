import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { type AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CheckoutSessionParamDto,
  checkoutSessionParamSchema,
  type CreateCheckoutSessionDto,
  createCheckoutSessionSchema,
  type CreatePaymentMethodSetupSessionDto,
  createPaymentMethodSetupSessionSchema,
} from '../dto/checkout.dto';
import { CheckoutService } from '../services/checkout.service';
import { PaymentMethodSetupService } from '../services/payment-method-setup.service';
import {
  type CheckoutSessionView,
  type PaymentMethodSetupSessionView,
} from '../types/checkout.types';
import { PlanCatalogClient } from '../../plan-catalog/plan-catalog.client';
import { type PlanCatalogEntry } from '../../plan-catalog/types/plan-catalog.types';

// The identity always comes from the verified JWT via @CurrentUser, never from
// the request body. That single rule is what stops one customer from starting a
// subscription in another customer's name.
@Controller('billing')
export class CheckoutController {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly paymentMethodSetup: PaymentMethodSetupService,
    private readonly catalog: PlanCatalogClient,
  ) {}

  @Get('plans')
  async listPlans(): Promise<PlanCatalogEntry[]> {
    return this.catalog.listCatalog();
  }

  @Post('payment-method-setup-sessions')
  @HttpCode(HttpStatus.CREATED)
  async createPaymentMethodSetupSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPaymentMethodSetupSessionSchema))
    dto: CreatePaymentMethodSetupSessionDto,
  ): Promise<PaymentMethodSetupSessionView> {
    return this.paymentMethodSetup.start({
      userId: user.id,
      userEmail: user.email,
      idempotencyKey: dto.idempotencyKey,
      consentToStore: dto.consentToStore,
    });
  }

  @Post('checkout-sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCheckoutSessionSchema)) dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionView> {
    return this.checkout.start({
      userId: user.id,
      userEmail: user.email,
      planId: dto.planId,
      billingInterval: dto.billingInterval,
      gateway: dto.gateway,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Get('checkout-sessions/:id')
  async getSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(checkoutSessionParamSchema)) params: CheckoutSessionParamDto,
  ): Promise<CheckoutSessionView> {
    return this.checkout.findOwned(user.id, params.id);
  }
}
