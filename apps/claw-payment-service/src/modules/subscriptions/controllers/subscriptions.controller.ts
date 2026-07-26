import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { type AuthenticatedUser } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type CancelSubscriptionDto,
  cancelSubscriptionSchema,
  type PlanChangeConfirmDto,
  planChangeConfirmSchema,
  type PlanChangeQuoteDto,
  planChangeQuoteSchema,
} from '../../checkout/dto/checkout.dto';
import { type PaymentMethodParamDto, paymentMethodParamSchema } from '../dto/subscriptions.dto';
import { PaymentMethodService } from '../services/payment-method.service';
import { PlanChangeService } from '../services/plan-change.service';
import { SubscriptionCancelService } from '../services/subscription-cancel.service';
import { SubscriptionQueryService } from '../services/subscription-query.service';
import {
  type CurrentSubscriptionView,
  type InvoiceView,
  type PaymentMethodView,
  type ProrationQuoteResponse,
} from '../types/subscription-view.types';
import { type CheckoutSessionView } from '../../checkout/types/checkout.types';

// Identity always comes from the verified JWT via @CurrentUser, never from a
// request body or path. Every service method below is scoped by that userId.
@Controller('billing')
export class SubscriptionsController {
  constructor(
    private readonly query: SubscriptionQueryService,
    private readonly planChange: PlanChangeService,
    private readonly cancellation: SubscriptionCancelService,
    private readonly methods: PaymentMethodService,
  ) {}

  @Get('me')
  async getCurrent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CurrentSubscriptionView | null> {
    return this.query.findCurrent(user.id);
  }

  @Get('invoices')
  async listInvoices(@CurrentUser() user: AuthenticatedUser): Promise<InvoiceView[]> {
    return this.query.listInvoices(user.id);
  }

  @Get('payment-methods')
  async listPaymentMethods(@CurrentUser() user: AuthenticatedUser): Promise<PaymentMethodView[]> {
    return this.query.listPaymentMethods(user.id);
  }

  @Delete('payment-methods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePaymentMethod(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(paymentMethodParamSchema)) params: PaymentMethodParamDto,
  ): Promise<void> {
    await this.methods.remove(user.id, params.id);
  }

  @Post('subscription/change/quote')
  @HttpCode(HttpStatus.OK)
  async quotePlanChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(planChangeQuoteSchema)) dto: PlanChangeQuoteDto,
  ): Promise<ProrationQuoteResponse> {
    return this.planChange.quote(user.id, dto.targetPlanId, dto.billingInterval);
  }

  @Post('subscription/change/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPlanChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(planChangeConfirmSchema)) dto: PlanChangeConfirmDto,
  ): Promise<CheckoutSessionView | null> {
    return this.planChange.confirm({
      userId: user.id,
      userEmail: user.email,
      quoteId: dto.quoteId,
      gateway: dto.gateway,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Post('subscription/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(cancelSubscriptionSchema)) _dto: CancelSubscriptionDto,
  ): Promise<CurrentSubscriptionView> {
    return this.cancellation.cancelAtPeriodEnd(user.id);
  }

  @Post('subscription/resume')
  @HttpCode(HttpStatus.OK)
  async resume(@CurrentUser() user: AuthenticatedUser): Promise<CurrentSubscriptionView> {
    return this.cancellation.resume(user.id);
  }
}
