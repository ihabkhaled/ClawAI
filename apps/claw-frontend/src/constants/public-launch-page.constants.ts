import { PUBLIC_COMMERCE_POLICY_EFFECTIVE_DATE } from '@/constants/public-contact.constants';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';

export const PUBLIC_LAUNCH_EFFECTIVE_DATE = '2026-07-27';

/** Pages whose effective date is not the launch date, because they were published later. */
export const PUBLIC_LAUNCH_EFFECTIVE_DATE_BY_SLUG: Readonly<
  Partial<Record<PublicLaunchPageSlug, string>>
> = {
  [PublicLaunchPageSlug.DELIVERY_SHIPPING]: PUBLIC_COMMERCE_POLICY_EFFECTIVE_DATE,
  [PublicLaunchPageSlug.REFUND_CANCELLATION]: PUBLIC_COMMERCE_POLICY_EFFECTIVE_DATE,
};

export const LEGAL_PUBLIC_LAUNCH_SLUGS: ReadonlySet<PublicLaunchPageSlug> = new Set([
  PublicLaunchPageSlug.PRIVACY,
  PublicLaunchPageSlug.TERMS,
  PublicLaunchPageSlug.COOKIES,
  PublicLaunchPageSlug.ACCEPTABLE_USE,
  PublicLaunchPageSlug.DELIVERY_SHIPPING,
  PublicLaunchPageSlug.REFUND_CANCELLATION,
]);

/** Pages that show the company's contact details (email, optional phone, address). */
export const COMPANY_DETAILS_PUBLIC_LAUNCH_SLUGS: ReadonlySet<PublicLaunchPageSlug> = new Set([
  PublicLaunchPageSlug.ABOUT,
  PublicLaunchPageSlug.DELIVERY_SHIPPING,
  PublicLaunchPageSlug.REFUND_CANCELLATION,
]);
