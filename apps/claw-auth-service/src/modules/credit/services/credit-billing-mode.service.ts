import { Injectable, Logger } from '@nestjs/common';
import { PaygBillingMode, UserRole } from '@claw/shared-types';

import { AuthRepository } from '../../auth/repositories/auth.repository';
import { PlansRepository } from '../../plans/repositories/plans.repository';
import { billingModeForAssignment } from '../utilities/credit-billing-mode.utility';

/**
 * Decides whether a settled cost may be shown back to the user it was charged
 * to (F108, ADR-078 addendum).
 *
 * Lives in auth-service for the same reason classification does (rule 37 item
 * 9): the plan and the role are auth's own data, and a predicate compiled into
 * six `node_modules` copies could not be corrected without six rebuilds.
 *
 * FAIL CLOSED. This is the gate in front of a margin figure, so every path that
 * is not a positive "billed per use" answer returns `UNKNOWN`: an
 * administrator (who bypasses metering and should never reach here), a user the
 * repository cannot find, a lookup that throws. A thrown lookup must not become
 * a settlement failure either - the money has already moved - so it is
 * swallowed to `UNKNOWN` with the cause logged and the user left unnamed.
 */
@Injectable()
export class CreditBillingModeService {
  private readonly logger = new Logger(CreditBillingModeService.name);

  constructor(
    private readonly users: AuthRepository,
    private readonly plans: PlansRepository,
  ) {}

  async resolve(userId: string): Promise<PaygBillingMode> {
    try {
      const user = await this.users.findUserById(userId);
      return user === null || user.role === UserRole.ADMIN
        ? PaygBillingMode.UNKNOWN
        : billingModeForAssignment(await this.plans.findEffectiveProvenance(userId, new Date()));
    } catch (error) {
      this.logger.warn(`resolve: billing mode unavailable — ${(error as Error).message}`);
      return PaygBillingMode.UNKNOWN;
    }
  }
}
