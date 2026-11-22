'use client';

import { CompanyContactCard } from '@/components/marketing/shared/company-contact-card';
import { useTranslation } from '@/lib/i18n';

import { ContactForm } from './contact-form';

// Client section for the contact page: localized heading + subtitle, the
// company's direct contact details (email, optional phone, address), then the
// form. The server page owns metadata/SEO; this owns the translated copy
// (useTranslation is client-only).
export function ContactSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
          {t('marketing.contact.title')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-base">
          {t('marketing.contact.subtitle')}
        </p>
      </div>
      <div className="mb-8">
        <CompanyContactCard
          title={t('marketing.contact.directHeading')}
          emailLabel={t('marketing.contact.directEmailLabel')}
          phoneLabel={t('marketing.contact.phoneLabel')}
          addressLabel={t('marketing.contact.addressLabel')}
          note={t('marketing.contact.addressNote')}
        />
      </div>
      <ContactForm />
    </section>
  );
}
