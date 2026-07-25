import { BillingErrorCode, SubscriptionStatus } from '@claw/shared-types';

import { BillingException } from '../../errors/billing.exception';
import {
  ENTITLEMENT_BEARING_STATUSES,
  SUBSCRIPTION_TRANSITIONS,
} from '../../constants/subscription-transitions.constants';
import {
  allowedNextStatuses,
  assertTransition,
  canTransition,
  hasActiveEntitlement,
  isEntitlementBearingStatus,
  isTerminalStatus,
  resolveUniqueActiveKey,
} from '../subscription-state-machine.utility';

const NOW = Date.UTC(2026, 6, 25, 12, 0, 0);
const HOUR = 60 * 60 * 1000;

describe('subscription-state-machine.utility', () => {
  describe('transition table completeness', () => {
    it('declares an entry for every SubscriptionStatus', () => {
      // A missing entry would make canTransition fail closed for that status,
      // silently freezing subscriptions in it.
      for (const status of Object.values(SubscriptionStatus)) {
        expect(SUBSCRIPTION_TRANSITIONS[status]).toBeDefined();
      }
    });

    it('only ever targets known statuses', () => {
      const known = new Set<string>(Object.values(SubscriptionStatus));
      for (const targets of Object.values(SUBSCRIPTION_TRANSITIONS)) {
        for (const target of targets) {
          expect(known.has(target)).toBe(true);
        }
      }
    });

    it('is frozen so no caller can widen it at runtime', () => {
      expect(Object.isFrozen(SUBSCRIPTION_TRANSITIONS)).toBe(true);
    });
  });

  describe('canTransition — the paths that must be open', () => {
    it.each([
      [SubscriptionStatus.PENDING, SubscriptionStatus.ACTIVE],
      [SubscriptionStatus.INCOMPLETE, SubscriptionStatus.ACTIVE],
      [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
      [SubscriptionStatus.ACTIVE, SubscriptionStatus.ACTIVE],
      [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCEL_AT_PERIOD_END],
      [SubscriptionStatus.PAST_DUE, SubscriptionStatus.ACTIVE],
      [SubscriptionStatus.PAST_DUE, SubscriptionStatus.EXPIRED],
      [SubscriptionStatus.CANCEL_AT_PERIOD_END, SubscriptionStatus.ACTIVE],
      [SubscriptionStatus.CANCEL_AT_PERIOD_END, SubscriptionStatus.EXPIRED],
      [SubscriptionStatus.SUSPENDED, SubscriptionStatus.ACTIVE],
    ])('allows %s -> %s', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    });
  });

  describe('canTransition — the paths that must stay shut', () => {
    it('refuses to resurrect a cancelled subscription without a new payment', () => {
      expect(canTransition(SubscriptionStatus.CANCELLED, SubscriptionStatus.ACTIVE)).toBe(false);
    });

    it('refuses to resurrect an expired subscription', () => {
      expect(canTransition(SubscriptionStatus.EXPIRED, SubscriptionStatus.ACTIVE)).toBe(false);
    });

    it('treats CHARGEBACK as fully terminal', () => {
      // Restoring access after a dispute requires a NEW paid subscription.
      for (const target of Object.values(SubscriptionStatus)) {
        expect(canTransition(SubscriptionStatus.CHARGEBACK, target)).toBe(false);
      }
      expect(isTerminalStatus(SubscriptionStatus.CHARGEBACK)).toBe(true);
    });

    it('allows only a chargeback to follow a refund', () => {
      expect(canTransition(SubscriptionStatus.REFUNDED, SubscriptionStatus.CHARGEBACK)).toBe(true);
      expect(canTransition(SubscriptionStatus.REFUNDED, SubscriptionStatus.ACTIVE)).toBe(false);
      expect(canTransition(SubscriptionStatus.REFUNDED, SubscriptionStatus.PAST_DUE)).toBe(false);
    });

    it('does not let a pending subscription skip straight to past-due', () => {
      expect(canTransition(SubscriptionStatus.PENDING, SubscriptionStatus.PAST_DUE)).toBe(false);
    });

    it('fails closed on an unrecognised source status', () => {
      expect(canTransition('NOT_A_STATUS' as SubscriptionStatus, SubscriptionStatus.ACTIVE)).toBe(
        false,
      );
    });
  });

  describe('assertTransition', () => {
    it('passes silently for a legal transition', () => {
      expect(() => {
        assertTransition(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE);
      }).not.toThrow();
    });

    it('throws a conflict carrying both endpoints', () => {
      try {
        assertTransition(SubscriptionStatus.CANCELLED, SubscriptionStatus.ACTIVE);
        throw new Error('expected throw');
      } catch (error) {
        expect(error).toBeInstanceOf(BillingException);
        const exception = error as BillingException;
        expect(exception.code).toBe(BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT);
        expect(exception.getStatus()).toBe(409);
        expect(exception.getResponse()).toMatchObject({
          details: { from: SubscriptionStatus.CANCELLED, to: SubscriptionStatus.ACTIVE },
        });
      }
    });
  });

  describe('isEntitlementBearingStatus', () => {
    it('covers exactly ACTIVE, PAST_DUE and CANCEL_AT_PERIOD_END', () => {
      expect([...ENTITLEMENT_BEARING_STATUSES].sort()).toEqual(
        [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.CANCEL_AT_PERIOD_END,
          SubscriptionStatus.PAST_DUE,
        ].sort(),
      );
    });

    it('excludes every terminal and pre-payment status', () => {
      for (const status of [
        SubscriptionStatus.PENDING,
        SubscriptionStatus.INCOMPLETE,
        SubscriptionStatus.PAUSED,
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.EXPIRED,
        SubscriptionStatus.REFUNDED,
        SubscriptionStatus.CHARGEBACK,
        SubscriptionStatus.SUSPENDED,
      ]) {
        expect(isEntitlementBearingStatus(status)).toBe(false);
      }
    });

    it('never grants entitlement to a PENDING subscription', () => {
      // PENDING means no verified payment yet — the core invariant.
      expect(isEntitlementBearingStatus(SubscriptionStatus.PENDING)).toBe(false);
    });
  });

  describe('hasActiveEntitlement', () => {
    it('grants an ACTIVE subscription inside its window', () => {
      expect(hasActiveEntitlement(SubscriptionStatus.ACTIVE, NOW + HOUR, null, NOW)).toBe(true);
    });

    it('revokes at the exact instant the window closes', () => {
      expect(hasActiveEntitlement(SubscriptionStatus.ACTIVE, NOW, null, NOW)).toBe(false);
    });

    it('revokes once the window has passed', () => {
      expect(hasActiveEntitlement(SubscriptionStatus.ACTIVE, NOW - 1, null, NOW)).toBe(false);
    });

    it('keeps a past-due subscription inside its grace window', () => {
      // A bounced card must not cut a paying customer off instantly.
      expect(hasActiveEntitlement(SubscriptionStatus.PAST_DUE, NOW + HOUR, NOW + HOUR, NOW)).toBe(
        true,
      );
    });

    it('revokes a past-due subscription once grace expires', () => {
      expect(hasActiveEntitlement(SubscriptionStatus.PAST_DUE, NOW + HOUR, NOW, NOW)).toBe(false);
    });

    it('revokes a past-due subscription with no grace window recorded', () => {
      // Absence of a deadline must not read as an unlimited one.
      expect(hasActiveEntitlement(SubscriptionStatus.PAST_DUE, NOW + HOUR, null, NOW)).toBe(false);
    });

    it('keeps a cancel-at-period-end subscription until the period ends', () => {
      expect(
        hasActiveEntitlement(SubscriptionStatus.CANCEL_AT_PERIOD_END, NOW + HOUR, null, NOW),
      ).toBe(true);
    });

    it('revokes a chargeback immediately, even inside the paid window', () => {
      // The money was taken back; a remaining window must not keep access open.
      expect(hasActiveEntitlement(SubscriptionStatus.CHARGEBACK, NOW + 999 * HOUR, null, NOW)).toBe(
        false,
      );
    });

    it('revokes a suspension immediately, even inside the paid window', () => {
      expect(hasActiveEntitlement(SubscriptionStatus.SUSPENDED, NOW + 999 * HOUR, null, NOW)).toBe(
        false,
      );
    });

    it('never grants entitlement for a non-bearing status, whatever the dates', () => {
      for (const status of [
        SubscriptionStatus.PENDING,
        SubscriptionStatus.INCOMPLETE,
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.EXPIRED,
        SubscriptionStatus.REFUNDED,
        SubscriptionStatus.PAUSED,
      ]) {
        expect(hasActiveEntitlement(status, NOW + 999 * HOUR, NOW + 999 * HOUR, NOW)).toBe(false);
      }
    });
  });

  describe('resolveUniqueActiveKey', () => {
    it('returns the userId while entitlement-bearing, so a second live subscription collides', () => {
      for (const status of ENTITLEMENT_BEARING_STATUSES) {
        expect(resolveUniqueActiveKey(status, 'user_1')).toBe('user_1');
      }
    });

    it('returns null once ended, so any number of past subscriptions coexist', () => {
      for (const status of [
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.EXPIRED,
        SubscriptionStatus.REFUNDED,
        SubscriptionStatus.CHARGEBACK,
        SubscriptionStatus.SUSPENDED,
        SubscriptionStatus.PAUSED,
        SubscriptionStatus.PENDING,
      ]) {
        expect(resolveUniqueActiveKey(status, 'user_1')).toBeNull();
      }
    });
  });

  describe('allowedNextStatuses', () => {
    it('returns the table row for a known status', () => {
      expect(allowedNextStatuses(SubscriptionStatus.ACTIVE)).toEqual(
        SUBSCRIPTION_TRANSITIONS[SubscriptionStatus.ACTIVE],
      );
    });

    it('returns an empty list for a terminal status', () => {
      expect(allowedNextStatuses(SubscriptionStatus.CHARGEBACK)).toEqual([]);
    });

    it('returns an empty list for an unknown status', () => {
      expect(allowedNextStatuses('NOPE' as SubscriptionStatus)).toEqual([]);
    });
  });
});
