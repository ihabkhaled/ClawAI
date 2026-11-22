import {
  PUBLIC_COMPANY_ADDRESS,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_EMAIL_HREF,
  PUBLIC_CONTACT_PHONE,
} from '@/constants/public-contact.constants';
import type { CompanyContactCardProps } from '@/types/public-launch-content.types';
import { buildTelHref } from '@/utilities/public-contact.utility';

// The company's public contact facts (email, optional phone, address), shared by
// the Contact page, the About page and the commerce policies. Pure render: no
// hooks, so it works inside server and client components alike. The phone row
// renders only when PUBLIC_CONTACT_PHONE is set.
export function CompanyContactCard({
  title,
  emailLabel,
  phoneLabel,
  addressLabel,
  note,
}: CompanyContactCardProps): React.ReactElement {
  return (
    <section aria-label={title} className="border-border bg-surface-shell border p-6">
      <h2 className="text-foreground text-lg font-semibold">{title}</h2>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
        <dt className="text-muted-foreground font-medium">{emailLabel}</dt>
        <dd>
          <a
            href={PUBLIC_CONTACT_EMAIL_HREF}
            className="text-primary focus-visible:ring-ring font-semibold break-all hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {PUBLIC_CONTACT_EMAIL}
          </a>
        </dd>
        {PUBLIC_CONTACT_PHONE === null ? null : (
          <>
            <dt className="text-muted-foreground font-medium">{phoneLabel}</dt>
            <dd>
              <a
                href={buildTelHref(PUBLIC_CONTACT_PHONE)}
                dir="ltr"
                className="text-primary focus-visible:ring-ring font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {PUBLIC_CONTACT_PHONE}
              </a>
            </dd>
          </>
        )}
        <dt className="text-muted-foreground font-medium">{addressLabel}</dt>
        <dd className="text-foreground">
          <address className="not-italic">{PUBLIC_COMPANY_ADDRESS}</address>
        </dd>
      </dl>
      <p className="text-muted-foreground mt-4 text-sm leading-6">{note}</p>
    </section>
  );
}
