import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { type AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CheckoutSessionParamDto,
  checkoutSessionParamSchema,
  type CompletePaypalCheckoutDto,
  completePaypalCheckoutSchema,
  type CompletePaypalSdkCheckoutDto,
  completePaypalSdkCheckoutSchema,
  type CreateCheckoutSessionDto,
  createCheckoutSessionSchema,
  type CreatePaymentMethodSetupSessionDto,
  createPaymentMethodSetupSessionSchema,
} from '../dto/checkout.dto';
import { CheckoutService } from '../services/checkout.service';
import { PaymentMethodSetupService } from '../services/payment-method-setup.service';
import { PaymobCheckoutCompletionService } from '../services/paymob-checkout-completion.service';
import { PaypalCheckoutCompletionService } from '../services/paypal-checkout-completion.service';
import {
  type CheckoutSessionView,
  type PaymentMethodSetupSessionView,
  type PaymobCompletionView,
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
    private readonly paypalCompletion: PaypalCheckoutCompletionService,
    private readonly paymobCompletion: PaymobCheckoutCompletionService,
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

  @Get('payment-method-setup-sessions/:id')
  async getPaymentMethodSetupSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(checkoutSessionParamSchema)) params: CheckoutSessionParamDto,
  ): Promise<PaymentMethodSetupSessionView> {
    return this.paymentMethodSetup.findOwned(user.id, params.id);
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

  @Post('checkout-sessions/:id/complete-paypal')
  async completePaypal(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(checkoutSessionParamSchema)) params: CheckoutSessionParamDto,
    @Body(new ZodValidationPipe(completePaypalCheckoutSchema))
    dto: CompletePaypalCheckoutDto,
  ): Promise<CheckoutSessionView> {
    return this.paypalCompletion.complete({
      userId: user.id,
      sessionId: params.id,
      providerOrderId: dto.providerOrderId,
      state: dto.state,
    });
  }

  @Post('checkout-sessions/:id/complete-paypal-sdk')
  async completePaypalSdk(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(checkoutSessionParamSchema)) params: CheckoutSessionParamDto,
    @Body(new ZodValidationPipe(completePaypalSdkCheckoutSchema))
    dto: CompletePaypalSdkCheckoutDto,
  ): Promise<CheckoutSessionView> {
    return this.paypalCompletion.completeSdk({
      userId: user.id,
      sessionId: params.id,
      providerOrderId: dto.providerOrderId,
    });
  }

  @Post('checkout-sessions/:id/complete-paymob')
  async completePaymob(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(checkoutSessionParamSchema)) params: CheckoutSessionParamDto,
  ): Promise<PaymobCompletionView> {
    return this.paymobCompletion.complete({
      userId: user.id,
      sessionId: params.id,
    });
  }
}
