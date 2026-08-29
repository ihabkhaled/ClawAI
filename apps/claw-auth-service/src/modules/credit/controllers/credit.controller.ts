import { Controller, Get, Query } from '@nestjs/common';
import { type CreditPackageView, type PaygWalletSnapshot, Permission } from '@claw/shared-types';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../common/types';
import { type CreditLedgerQueryDto, creditLedgerQuerySchema } from '../dto/credit-ledger-query.dto';
import { CreditAccountService } from '../services/credit-account.service';
import { CreditPackageService } from '../services/credit-package.service';
import { type CreditLedgerPage } from '../types/credit.types';

/**
 * The signed-in user's own wallet.
 *
 * Ownership comes from the JWT, never from a path or query parameter — there is
 * no route here that takes a user id, so there is nothing to enumerate and no
 * IDOR to get wrong. Needs its own nginx location: `/api/v1/billing` already
 * proxies to payment-service, so the wallet cannot live under it.
 */
@Controller('credit')
export class CreditController {
  constructor(
    private readonly accounts: CreditAccountService,
    private readonly packages: CreditPackageService,
  ) {}

  @Get('me')
  async getWallet(@CurrentUser() user: AuthenticatedUser): Promise<PaygWalletSnapshot> {
    return this.accounts.getWallet(user.id);
  }

  @Get('me/ledger')
  async getLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(creditLedgerQuerySchema)) query: CreditLedgerQueryDto,
  ): Promise<CreditLedgerPage> {
    return this.accounts.getLedgerPage({
      userId: user.id,
      cursor: query.cursor ?? null,
      limit: query.limit,
    });
  }

  // Gated on the top-up permission because this list IS the purchase entry
  // point: a role that may not buy credit has no business being shown prices.
  @Get('packages')
  @RequirePermissions(Permission.BILLING_CREDIT_TOPUP)
  async listPackages(): Promise<CreditPackageView[]> {
    return this.packages.listPurchasable();
  }
}
