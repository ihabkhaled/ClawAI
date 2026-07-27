import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import {
  type AuthenticatedUser,
  Permission,
  type RefundableTransactionView,
  type RefundView,
} from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type CreateRefundDto, createRefundSchema } from '../dto/refund.dto';
import { RefundManager } from '../managers/refund.manager';
import { RefundQueryService } from '../services/refund-query.service';

@Controller('admin/billing/refunds')
@RequirePermissions(Permission.ADMIN_PLANS_MANAGE)
export class RefundController {
  constructor(
    private readonly refunds: RefundManager,
    private readonly queries: RefundQueryService,
  ) {}

  @Get('refundable-transactions')
  async listRefundableTransactions(): Promise<RefundableTransactionView[]> {
    return this.queries.listRefundableTransactions();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() admin: AuthenticatedUser,
    @Body(new ZodValidationPipe(createRefundSchema)) dto: CreateRefundDto,
  ): Promise<RefundView> {
    return this.refunds.request({
      ...dto,
      requestedByUserId: admin.id,
    });
  }
}
