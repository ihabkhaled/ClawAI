import { describe, expect, it } from 'vitest';

import { CODING_AGENT_CONTENT_BY_LOCALE } from '@/constants/coding-agent-content.constants';
import { COMPARISON_CONTENT_BY_LOCALE } from '@/constants/public-comparison-content.constants';
import { PUBLIC_PAGE_SEO_BY_LOCALE } from '@/constants/public-page-seo.constants';
import { Locale } from '@/enums/locale.enum';
import { getDictionary } from '@/lib/i18n/translations';

/**
 * ADR-126 retired "one subscription" as the product's pitch. The phrases
 * below are each locale's rendering of "one/a single/the same subscription"
 * as it appeared in the marketing copy before the rewrite. Generic uses
 * ("you have no active subscription", "several subscriptions" when describing
 * the rivals) are not matched.
 */
const RETIRED_PHRASES: Record<Locale, RegExp> = {
  [Locale.EN]: /\b(one|a single|the same) subscription\b/i,
  [Locale.AR]: /باشتراك واحد|^اشتراك واحد|عبر اشتراك واحد|خلف اشتراك واحد|الاشتراك نفسه/,
  [Locale.DE]:
    /(ein einziges|demselben) Abonnement|Ein Abonnement (deckt|erreicht)|(in|hinter) ein Abonnement|ein Abonnement, das/i,
  [Locale.ES]: /(una sola|la misma) suscripción/i,
  [Locale.FA]: /زیر یک اشتراک|همان اشتراک|یک اشتراک که|^یک اشتراک/,
  [Locale.FR]: /(un seul|même) abonnement|abonnement unique/i,
  [Locale.HI]: /एक (ही )?(सब्सक्रिप्शन|सदस्यता)|उसी सदस्यता/,
  [Locale.IT]: /(un solo|un unico|lo stesso) abbonamento/i,
  [Locale.JA]: /1 つのサブスクリプション|同じサブスクリプション/,
  [Locale.PT]: /(uma só|uma única|mesma) assinatura/i,
  // Accusative "одну подписку" is left out on purpose: the rivals' copy says
  // "ещё одну подписку" (one MORE subscription), which is not the pitch.
  [Locale.RU]: /одн(ой|а) подписк|единая подписк|той же подписк/i,
  [Locale.TH]: /การสมัครสมาชิก(เดียว|หนึ่งครั้ง|เพียงครั้งเดียว)/,
  [Locale.ZH]: /一份订阅|一次订阅|单一订阅|同一份订阅/,
};

function collectStrings(value: unknown, out: string[]): string[] {
  if (typeof value === 'string') {
    out.push(value);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectStrings(item, out);
    }
  }
  return out;
}

describe('the retired "one subscription" pitch', () => {
  it.each(Object.values(Locale))('%s: no public copy still sells "one subscription"', (locale) => {
    const d = getDictionary(locale);
    const strings = collectStrings(
      [
        d.marketing,
        PUBLIC_PAGE_SEO_BY_LOCALE[locale],
        COMPARISON_CONTENT_BY_LOCALE[locale],
        CODING_AGENT_CONTENT_BY_LOCALE[locale],
      ],
      [],
    );
    const offenders = strings.filter((s) => RETIRED_PHRASES[locale].test(s));
    expect(offenders).toEqual([]);
  });

  it.each(Object.values(Locale))(
    '%s: the teams FAQ does not promise pooled billing or a shared team account',
    (locale) => {
      const answer = getDictionary(locale).marketing.faqPage.organisations.teamAccountsA;
      if (locale === Locale.EN) {
        expect(answer).not.toMatch(/give a shared workspace/i);
        expect(answer).toMatch(/not available today/);
      } else {
        expect(answer).not.toBe(
          getDictionary(Locale.EN).marketing.faqPage.organisations.teamAccountsA,
        );
      }
    },
  );
});
