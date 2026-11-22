/**
 * The company's public contact facts, shown on the Contact and About pages, in
 * the marketing footer, in the delivery and refund policies, and in the
 * Organization JSON-LD. One source, so the footer and a policy can never name
 * two different addresses.
 *
 * Owner decisions (2026-11-22): email only for now; the address is the city and
 * country with no street, because the company has no physical office.
 */
export const PUBLIC_CONTACT_EMAIL = 'admin@claw-ai.co';

export const PUBLIC_CONTACT_EMAIL_HREF = `mailto:${PUBLIC_CONTACT_EMAIL}`;

/**
 * Optional public phone number. `null` renders nothing anywhere; set an
 * international number (for example `+20 …`) to show it on every surface and in
 * the Organization ContactPoint. Never put a placeholder here.
 */
export const PUBLIC_CONTACT_PHONE: string | null = null;

export const PUBLIC_COMPANY_ADDRESS = 'Cairo, Egypt';

/** The same address, structured for schema.org PostalAddress. */
export const PUBLIC_COMPANY_POSTAL_ADDRESS = {
  addressLocality: 'Cairo',
  addressCountry: 'EG',
} as const;

/** Effective date of the delivery and refund policies, first published together. */
export const PUBLIC_COMMERCE_POLICY_EFFECTIVE_DATE = '2026-11-22';
