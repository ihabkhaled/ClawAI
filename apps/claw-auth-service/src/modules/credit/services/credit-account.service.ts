import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  CREDIT_LEDGER_MAX_PAGE_SIZE,
  PAYG_ADJUSTMENT_REASON_MIN_LENGTH,
  PAYG_ENABLED_SETTING_KEY,
} from '@claw/shared-constants';
import {
  BillingErrorCode,
  type PaygLedgerEntryView,
  type PaygWalletSnapshot,
  UserRole,
} from '@claw/shared-types';

import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { CreditLedgerKind } from '../../../generated/prisma';
import { AuthRepository } from '../../auth/repositories/auth.repository';
import { SystemSettingService } from '../../system-settings/services/system-setting.service';
import { CreditLedgerRepository } from '../repositories/credit-ledger.repository';
import { CreditGrantService } from './credit-grant.service';
import { CreditWalletService } from './credit-wallet.service';
import { type CreditAdjustmentInput, type CreditLedgerPage } from '../types/credit.types';
import { toLedgerEntryView, toWalletSnapshot } from '../utilities/credit-view.utility';

/**
 * The read side a human sees: their balance, their ledger, and the operator
 * tools that sit beside them.
 *
 * Kept apart from `CreditReservationManager` on purpose. Opening a billing page
 * must never take a hold, spend anything, or be able to.
 */
@Injectable()
export class CreditAccountService {
  private readonly logger = new Logger(CreditAccountService.name);

  constructor(
    private readonly wallets: CreditWalletService,
    private readonly grants: CreditGrantService,
    private readonly ledger: CreditLedgerRepository,
    private readonly users: AuthRepository,
    private readonly settings: SystemSettingService,
  ) {}

  /**
   * The wallet as the account page renders it.
   *
   * Rolls the period first, so a user who opens the page on the 1st sees this
   * month's allowance rather than last month's remainder — the same call the
   * reservation path makes, for the same reason.
   */
  async getWallet(userId: string): Promise<PaygWalletSnapshot> {
    const user = await this.users.findUserById(userId);
    if (user === null) {
      throw new EntityNotFoundException('User', userId);
    }
    const balances = await this.grants.ensureCurrentPeriod(userId);
    return toWalletSnapshot(balances.wallet, {
      adminBypass: user.role === UserRole.ADMIN,
      meteringEnabled: await this.settings.isEnabled(PAYG_ENABLED_SETTING_KEY, false),
    });
  }

  /**
   * One page of the ledger, newest first.
   *
   * `nextCursor` comes from a `limit + 1` read rather than a COUNT: the ledger
   * grows with every request, and counting it to paginate it would get slower
   * for exactly the users who have the most to look at.
   */
  async getLedgerPage(params: {
    userId: string;
    cursor: string | null;
    limit: number;
  }): Promise<CreditLedgerPage> {
    // Re-clamped here even though the DTO already bounds it: this method is
    // also reachable from the admin surface, and a page size is a database cost.
    const limit = Math.min(Math.max(params.limit, 1), CREDIT_LEDGER_MAX_PAGE_SIZE);
    const rows = await this.ledger.findPage({
      userId: params.userId,
      cursor: params.cursor,
      limit,
    });
    const page = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? (page.at(-1)?.id ?? null) : null;
    return { entries: page.map((row): PaygLedgerEntryView => toLedgerEntryView(row)), nextCursor };
  }

  /**
   * An operator correction.
   *
   * Both an actor and a reason are mandatory and are stored on the row. An
   * unattributed credit is indistinguishable from a fabricated payment, and the
   * first time finance asks where a balance came from is not when to discover
   * the answer was never recorded.
   *
   * A positive amount credits PURCHASED — never GRANT — so a support gesture
   * does not silently expire at the end of the month.
   */
  async adjust(input: CreditAdjustmentInput): Promise<PaygWalletSnapshot> {
    if (input.reason.trim().length < PAYG_ADJUSTMENT_REASON_MIN_LENGTH) {
      throw new BusinessException(
        'A credit adjustment requires a reason',
        BillingErrorCode.CREDIT_ADJUSTMENT_REASON_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    }
    const wallet = await this.wallets.ensure(input.userId);
    const updated =
      input.amountMicroUsd >= 0n
        ? await this.wallets.applyCredit({
            userId: input.userId,
            walletId: wallet.id,
            amountMicroUsd: input.amountMicroUsd,
            kind: CreditLedgerKind.ADMIN_ADJUSTMENT,
            toGrant: false,
            sourceEventId: null,
            actorUserId: input.actorUserId,
            reason: input.reason,
          })
        : await this.wallets.applyDebit({
            userId: input.userId,
            walletId: wallet.id,
            amountMicroUsd: -input.amountMicroUsd,
            kind: CreditLedgerKind.ADMIN_ADJUSTMENT,
            grantOnly: false,
            sourceEventId: null,
            actorUserId: input.actorUserId,
            reason: input.reason,
          });
    this.logger.log(`adjust: user=${input.userId} actor=${input.actorUserId}`);
    return toWalletSnapshot(updated, { adminBypass: false, meteringEnabled: true });
  }
}
