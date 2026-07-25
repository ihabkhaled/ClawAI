'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { HOW_IT_WORKS_PLAN_BULLET_KEYS } from '@/constants/marketing-how-it-works.constants';
import { ROUTES } from '@/constants/routes.constants';
import { useTranslation } from '@/lib/i18n';

export function AccountAndPlansSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="account" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.howItWorksPage.account.title')}
          </h2>

          <h3 className="text-foreground mt-8 text-lg font-medium">
            {t('marketing.howItWorksPage.account.registerHeading')}
          </h3>
          <p className="text-muted-foreground mt-3">
            {t('marketing.howItWorksPage.account.registerBody')}
          </p>

          <h3 className="text-foreground mt-8 text-lg font-medium">
            {t('marketing.howItWorksPage.account.plansHeading')}
          </h3>
          <p className="text-muted-foreground mt-3">
            {t('marketing.howItWorksPage.account.plansBody')}
          </p>

          <ul className="mt-6 space-y-3">
            {HOW_IT_WORKS_PLAN_BULLET_KEYS.map((bulletKey) => (
              <li key={bulletKey} className="text-muted-foreground flex gap-3 text-sm">
                <span className="bg-primary mt-2 h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden />
                <span>{t(bulletKey)}</span>
              </li>
            ))}
          </ul>

          <p className="text-muted-foreground mt-6">
            {t('marketing.howItWorksPage.account.upgradeNote')}
          </p>

          <div className="mt-8">
            <Link href={ROUTES.REGISTER} className={buttonVariants({ size: 'lg' })}>
              {t('marketing.howItWorksPage.account.ctaRegister')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
