'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useContactForm } from '@/hooks/contact/use-contact-form';

import { ContactSuccess } from './contact-success';

// Public contact form. Self-contained (calls its controller hook), matching
// the login-form pattern. The honeypot `company` field is visually hidden and
// aria-hidden so no real user or screen reader interacts with it.
export function ContactForm(): React.ReactElement {
  const { form, onSubmit, isPending, isSuccess, resetSuccess, t } = useContactForm();
  const { errors } = form.formState;

  if (isSuccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ContactSuccess
            title={t('marketing.contact.successTitle')}
            body={t('marketing.contact.successBody')}
            resetLabel={t('marketing.contact.sendAnother')}
            onReset={resetSuccess}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          onSubmit={(event) => {
            void onSubmit(event);
          }}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <label htmlFor="contact-name" className="text-sm leading-none font-medium">
              {t('marketing.contact.nameLabel')}
            </label>
            <Input
              id="contact-name"
              autoComplete="name"
              disabled={isPending}
              {...form.register('name')}
            />
            {errors.name ? (
              <p className="text-destructive text-xs">{t('marketing.contact.nameRequired')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="contact-email" className="text-sm leading-none font-medium">
              {t('marketing.contact.emailLabel')}
            </label>
            <Input
              id="contact-email"
              type="email"
              autoComplete="email"
              disabled={isPending}
              {...form.register('email')}
            />
            {errors.email ? (
              <p className="text-destructive text-xs">{t('marketing.contact.emailInvalid')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="contact-subject" className="text-sm leading-none font-medium">
              {t('marketing.contact.subjectLabel')}
            </label>
            <Input id="contact-subject" disabled={isPending} {...form.register('subject')} />
            {errors.subject ? (
              <p className="text-destructive text-xs">{t('marketing.contact.subjectRequired')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="contact-message" className="text-sm leading-none font-medium">
              {t('marketing.contact.messageLabel')}
            </label>
            <Textarea
              id="contact-message"
              rows={6}
              disabled={isPending}
              {...form.register('message')}
            />
            {errors.message ? (
              <p className="text-destructive text-xs">{t('marketing.contact.messageRequired')}</p>
            ) : null}
          </div>

          {/* Honeypot — hidden from real users and assistive tech. */}
          <div aria-hidden="true" className="hidden">
            <label htmlFor="contact-company">Company</label>
            <Input
              id="contact-company"
              tabIndex={-1}
              autoComplete="off"
              {...form.register('company')}
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isPending}>
            {isPending ? t('marketing.contact.submitting') : t('marketing.contact.submit')}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            {t('marketing.contact.privacyNote')}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
