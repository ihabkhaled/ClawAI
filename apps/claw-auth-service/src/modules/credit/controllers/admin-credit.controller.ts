import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { type CreditPackageView, type PaygWalletSnapshot, Permission } from '@claw/shared-types';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { type AuthenticatedUser } from '../../../common/types';
import {
  type AdjustCreditDto,
  adjustCreditSchema,
  type CreateCreditPackageDto,
  createCreditPackageSchema,
  type CreditPackageParamDto,
  creditPackageParamSchema,
  type PublishCreditPackageVersionDto,
  publishCreditPackageVersionSchema,
} from '../dto/credit-admin.dto';
import { type CreditWalletParamDto, creditWalletParamSchema } from '../dto/credit-internal.dto';
import { CreditAccountService } from '../services/credit-account.service';
import { CreditPackageService } from '../services/credit-package.service';

/**
 * Operator access to any wallet and to the top-up catalog.
 *
 * `ADMIN_CREDIT_MANAGE` on every route, and the actor comes from the JWT rather
 * than the body: an adjustment is a money movement, and "who did this" must not
 * be something the caller gets to assert. Routed under the already-proxied
 * `/api/v1/admin` prefix.
 */
@Controller('admin/credit')
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.ADMIN_CREDIT_MANAGE)
export class AdminCreditController {
  constructor(
    private readonly accounts: CreditAccountService,
    private readonly packages: CreditPackageService,
  ) {}

  @Get('wallets/:userId')
  async getWallet(
    @Param(new ZodValidationPipe(creditWalletParamSchema)) params: CreditWalletParamDto,
  ): Promise<PaygWalletSnapshot> {
    return this.accounts.getWallet(params.userId);
  }

  @Post('wallets/:userId/adjust')
  async adjust(
    @Param(new ZodValidationPipe(creditWalletParamSchema)) params: CreditWalletParamDto,
    @Body(new ZodValidationPipe(adjustCreditSchema)) dto: AdjustCreditDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PaygWalletSnapshot> {
    return this.accounts.adjust({
      userId: params.userId,
      amountMicroUsd: BigInt(dto.amountMicroUsd),
      reason: dto.reason,
      actorUserId: actor.id,
    });
  }

  @Get('packages')
  async listPackages(): Promise<CreditPackageView[]> {
    return this.packages.listForOperator();
  }

  @Post('packages')
  async createPackage(
    @Body(new ZodValidationPipe(createCreditPackageSchema)) dto: CreateCreditPackageDto,
  ): Promise<CreditPackageView> {
    return this.packages.createPackage(dto);
  }

  // Publishes a NEW immutable version. There is no update route by design: a
  // price change must never rewrite what an existing purchase was quoted.
  @Post('packages/:id/versions')
  async publishVersion(
    @Param(new ZodValidationPipe(creditPackageParamSchema)) params: CreditPackageParamDto,
    @Body(new ZodValidationPipe(publishCreditPackageVersionSchema))
    dto: PublishCreditPackageVersionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CreditPackageView> {
    return this.packages.publishVersion({
      packageId: params.id,
      priceMinor: dto.priceMinor,
      currency: dto.currency,
      creditMicroUsd: BigInt(dto.creditMicroUsd),
      actorUserId: actor.id,
    });
  }
}
