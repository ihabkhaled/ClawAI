import { CreditLedgerKind, PaygSurface } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';


import {
  BillingGateway,
  BillingInterval,
  PlanFeature,
  SubscriptionStatus,
} from '@/enums/billing.enum';
import { ar } from '@/lib/i18n/locales/ar';
import { de } from '@/lib/i18n/locales/de';
import { en } from '@/lib/i18n/locales/en';
import { es } from '@/lib/i18n/locales/es';
import { fa } from '@/lib/i18n/locales/fa';
import { fr } from '@/lib/i18n/locales/fr';
import { hi } from '@/lib/i18n/locales/hi';
import { it as itLocale } from '@/lib/i18n/locales/it';
import { ja } from '@/lib/i18n/locales/ja';
import { pt } from '@/lib/i18n/locales/pt';
import { ru } from '@/lib/i18n/locales/ru';
import { th } from '@/lib/i18n/locales/th';
import { zh } from '@/lib/i18n/locales/zh';
import type { TranslationDictionary } from '@/types/i18n.types';

// The billing UI labels enum members with template keys — t(`billing.status.${s}`).
//
// The i18n-key-references guard scans for LITERAL t('…') calls, so it is blind
// to these: a new SubscriptionStatus member would render the raw string
// "billing.status.PAUSED" to the user with typecheck, lint and tests all green.
// This test closes that hole by walking the enums themselves.
//
// PaygSurface and CreditLedgerKind are here because the hole was reached for
// real: the credit ledger's label maps in `constants/credit.constants.ts` are
// `Record<Enum, string>`, so the key-reference guard matched neither `t('a.b')`
// nor `*Key: 'a.b'`, and all 18 keys shipped referenced-but-undefined. Every
// row of the ledger would have rendered "billing.credit.surface.CHAT" to the
// user in 13 languages. Adding a member to either enum now fails here first.

const LOCALES: [string, TranslationDictionary][] = [
  ['en', en],
  ['ar', ar],
  ['de', de],
  ['es', es],
  ['fr', fr],
  ['hi', hi],
  ['it', itLocale],
  ['pt', pt],
  ['ru', ru],
  // Previously absent, so a missing label in any of these four shipped silently.
  ['fa', fa],
  ['ja', ja],
  ['th', th],
  ['zh', zh],
];

describe.each(LOCALES)('%s billing enum labels', (localeName, dictionary) => {
  it('labels every subscription status', () => {
    for (const status of Object.values(SubscriptionStatus)) {
      const label = dictionary.billing.status[status];
      expect(label, `${localeName}: billing.status.${status}`).toBeTypeOf('string');
      expect(label.length, `${localeName}: billing.status.${status} is empty`).toBeGreaterThan(0);
    }
  });

  it('labels every billing interval', () => {
    for (const interval of Object.values(BillingInterval)) {
      const label = dictionary.billing.interval[interval];
      expect(label, `${localeName}: billing.interval.${interval}`).toBeTypeOf('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('labels every plan feature', () => {
    for (const feature of Object.values(PlanFeature)) {
      const label = dictionary.billing.features[feature];
      expect(label, `${localeName}: billing.features.${feature}`).toBeTypeOf('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('labels every gateway', () => {
    for (const gateway of Object.values(BillingGateway)) {
      const label = dictionary.billing.gateway[gateway];
      expect(label, `${localeName}: billing.gateway.${gateway}`).toBeTypeOf('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('labels every PAYG credit surface', () => {
    for (const surface of Object.values(PaygSurface)) {
      const label = dictionary.billing.credit.surface[surface];
      expect(label, `${localeName}: billing.credit.surface.${surface}`).toBeTypeOf('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('labels every credit ledger kind', () => {
    for (const kind of Object.values(CreditLedgerKind)) {
      const label = dictionary.billing.credit.kind[kind];
      expect(label, `${localeName}: billing.credit.kind.${kind}`).toBeTypeOf('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
