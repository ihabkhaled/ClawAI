import { BillingIntervalKind, type UserCreditWallet } from '../../../../generated/prisma';
import { CreditGrantService } from '../credit-grant.service';
import { currentGrantPeriodKey } from '../../utilities/credit-period.utility';

const PRO_GRANT_MICRO_USD = 5_000_000n;

function wallet(overrides: Partial<UserCreditWallet> = {}): UserCreditWallet {
  return {
    id: 'w1',
    userId: 'u1',
    grantMicroUsd: PRO_GRANT_MICRO_USD,
    purchasedMicroUsd: 0n,
    reservedMicroUsd: 0n,
    periodGrantMicroUsd: PRO_GRANT_MICRO_USD,
    periodKey: currentGrantPeriodKey(new Date()),
    grantResetsAt: new Date(),
    lifetimeGrantedMicroUsd: PRO_GRANT_MICRO_USD,
    lifetimePurchasedMicroUsd: 0n,
    lifetimeConsumedMicroUsd: 0n,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as UserCreditWallet;
}

describe('CreditGrantService — mid-period plan changes', () => {
  const wallets = { ensure: jest.fn(), applyPeriodRoll: jest.fn() };
  const walletRepository = { findStalePeriodWallets: jest.fn() };
  const plans = { findEffectiveForUser: jest.fn(), findDefault: jest.fn() };
  const planBilling = { findActivePrice: jest.fn() };
  const events = { publishGrantRenewed: jest.fn() };

  function makeService(): CreditGrantService {
    return new CreditGrantService(
      wallets as never,
      walletRepository as never,
      plans as never,
      planBilling as never,
      events as never,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    plans.findEffectiveForUser.mockResolvedValue({
      id: 'free',
      slug: 'free',
      paygCreditPercentBps: 3000,
    });
    wallets.applyPeriodRoll.mockImplementation(async (input: { newGrantMicroUsd: bigint }) =>
      wallet({
        grantMicroUsd: input.newGrantMicroUsd,
        periodGrantMicroUsd: input.newGrantMicroUsd,
      }),
    );
  });

  it('takes the grant back when the user drops to an unpriced plan mid-period', async () => {
    // The reported bug: a Free account still holding a Pro plan's connector
    // credit, and spending it on paid models until the month turned.
    wallets.ensure.mockResolvedValue(wallet());
    planBilling.findActivePrice.mockResolvedValue(null);

    const balances = await makeService().ensureCurrentPeriod('u1');

    expect(wallets.applyPeriodRoll).toHaveBeenCalledWith(
      expect.objectContaining({ newGrantMicroUsd: 0n, expiringMicroUsd: PRO_GRANT_MICRO_USD }),
    );
    expect(balances.availableMicroUsd).toBe(0n);
  });

  it('leaves an unchanged plan alone', async () => {
    wallets.ensure.mockResolvedValue(wallet());
    planBilling.findActivePrice.mockResolvedValue({ amountMinor: 1_667 });

    await makeService().ensureCurrentPeriod('u1');

    expect(wallets.applyPeriodRoll).not.toHaveBeenCalled();
  });

  it('does NOT roll on an upgrade — that would mint a second full allowance', async () => {
    wallets.ensure.mockResolvedValue(wallet());
    planBilling.findActivePrice.mockResolvedValue({ amountMinor: 100_000 });

    await makeService().ensureCurrentPeriod('u1');

    expect(wallets.applyPeriodRoll).not.toHaveBeenCalled();
    expect(planBilling.findActivePrice).toHaveBeenCalledWith('free', BillingIntervalKind.MONTHLY);
  });
});
