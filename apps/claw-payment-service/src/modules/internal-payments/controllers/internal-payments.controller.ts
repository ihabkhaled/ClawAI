import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Public } from '@claw/shared-auth';
import type {
  AuthoritativeBillingEntitlement,
  InternalPaymentStatus,
  InternalSubscriptionStatus,
} from '@claw/shared-types';

import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type InternalPaymentIdParamDto,
  internalPaymentIdParamSchema,
  type InternalPaymentUserParamDto,
  internalPaymentUserParamSchema,
} from '../dto/internal-payments.dto';
import { InternalPaymentsService } from '../services/internal-payments.service';

@Controller('internal/payments')
@Public()
@UseGuards(ServiceTokenGuard)
export class InternalPaymentsController {
  constructor(private readonly payments: InternalPaymentsService) {}

  @Get('transactions/:id/status')
  async getPaymentStatus(
    @Param(new ZodValidationPipe(internalPaymentIdParamSchema)) params: InternalPaymentIdParamDto,
  ): Promise<InternalPaymentStatus> {
    return this.payments.getPaymentStatus(params.id);
  }

  @Get('subscriptions/:id/status')
  async getSubscriptionStatus(
    @Param(new ZodValidationPipe(internalPaymentIdParamSchema)) params: InternalPaymentIdParamDto,
  ): Promise<InternalSubscriptionStatus> {
    return this.payments.getSubscriptionStatus(params.id);
  }

  @Get('users/:userId/entitlement')
  async getAuthoritativeEntitlement(
    @Param(new ZodValidationPipe(internalPaymentUserParamSchema))
    params: InternalPaymentUserParamDto,
  ): Promise<AuthoritativeBillingEntitlement> {
    return this.payments.getAuthoritativeEntitlement(params.userId);
  }
}
