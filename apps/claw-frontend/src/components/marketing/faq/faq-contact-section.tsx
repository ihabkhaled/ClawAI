'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { MARKETING_FAQ_CONTACT_PATH } from '@/constants/marketing-faq.constants';
import { useTranslation } from '@/lib/i18n';

// Closing section: the FAQ cannot cover everything, so send the reader
// somewhere useful — the contact form for anything unanswered (including
// private deployments for organisations) or straight into sign-up.
export function FaqContactSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.faqPage.contact.title')}
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl">
          {t('marketing.faqPage.contact.description')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={MARKETING_FAQ_CONTACT_PATH} className={buttonVariants({ size: 'lg' })}>
            {t('marketing.faqPage.contact.ctaContact')}
          </Link>
          <Link
            href={ROUTES.REGISTER}
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            {t('marketing.faqPage.contact.ctaStart')}
          </Link>
        </div>
      </div>
    </section>
  );
}
