import { PUBLIC_CONTACT_EMAIL } from '@/constants/public-contact.constants';
import { EN_PUBLIC_LAUNCH_CHROME_LABELS } from '@/constants/public-launch-content/en-chrome-labels.constants';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import type { PublicCommercePolicyLocaleContent } from '@/types/public-launch-content.types';

export const EN_PUBLIC_COMMERCE_POLICY_CONTENT: PublicCommercePolicyLocaleContent = {
  pages: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      eyebrow: 'Delivery and shipping policy',
      sections: [
        {
          id: 'digital-service',
          title: 'ClawAI is a digital service',
          body: 'ClawAI is an online software service used in a web browser and in supported apps. There is no physical product: nothing is packed, posted or shipped, and no shipping address is collected. Everything a plan includes is delivered over the internet to the account that bought it.',
        },
        {
          id: 'instant-access',
          title: 'Access is online and immediate',
          body: 'A free account is ready as soon as signup is complete. When a paid plan is bought, it is applied to the account once the payment is confirmed, normally straight away, and you can sign in and use it immediately. There is no waiting period and no delivery schedule beyond this instant account activation.',
        },
        {
          id: 'no-fees',
          title: 'No shipping fees or delivery charges',
          body: 'Because nothing physical is sent, ClawAI never adds shipping, handling, customs or delivery fees. The price of a plan is the amount shown at checkout. Files you create in the product, such as documents or images, are downloaded from your account and are not posted to you.',
        },
        {
          id: 'access-problems',
          title: 'If you cannot access what you paid for',
          body: `If a payment succeeded but the plan does not appear on your account, or you cannot sign in, email ${PUBLIC_CONTACT_EMAIL} with the email address of the account and the payment reference if you have one. We will check the payment and the account and resolve access to what you paid for.`,
        },
      ],
      evidence:
        'ClawAI is operated online from Cairo, Egypt. Delivery of a subscription means activation of the account it was bought for, and hosted checkout shows the active price before payment.',
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      eyebrow: 'Refund and cancellation policy',
      sections: [
        {
          id: 'cancel',
          title: 'Cancel any time from your account',
          body: 'You can cancel a paid subscription at any time from the billing settings in your account. Cancelling stops the subscription from renewing, so you are not charged for the next billing period. You do not need to email anyone or give a reason to cancel.',
        },
        {
          id: 'access-after-cancel',
          title: 'Access continues until the end of the paid period',
          body: 'After you cancel, the plan stays active until the end of the period you have already paid for, whether that is a month or a longer term. Your paid features remain available until that date, and the subscription then stops instead of renewing and charging you again.',
        },
        {
          id: 'refunds',
          title: 'When a refund is given',
          body: 'The current paid period, and any period already used, is not refunded, because access to the service has already been provided. Refunds are given only when we made a billing error, such as a duplicate or incorrect charge, or where the law that applies to you requires one. When a payment is refunded in full, the paid access it bought ends.',
        },
        {
          id: 'trial-and-requests',
          title: 'Free trial and how to ask for a refund',
          body: `The 90-day free trial needs no payment card, so nothing is charged and there is nothing to refund while you try ClawAI. To report a billing error or request a refund, email ${PUBLIC_CONTACT_EMAIL} with the account email address, the date and amount of the charge, and the payment reference if you have it.`,
        },
      ],
      evidence:
        'This policy works together with the Terms of use, where payment terms follow the checkout disclosure and applicable law. The active price and billing interval are shown at hosted checkout before you pay.',
    },
  },
  labels: EN_PUBLIC_LAUNCH_CHROME_LABELS,
  seo: {
    [PublicLaunchPageSlug.DELIVERY_SHIPPING]: {
      title: 'Delivery and shipping policy',
      description:
        'ClawAI is a digital service: access is online and starts as soon as signup or payment is confirmed. Nothing is shipped and there are no delivery fees.',
      keywords: ['delivery policy', 'shipping policy', 'digital service access'],
    },
    [PublicLaunchPageSlug.REFUND_CANCELLATION]: {
      title: 'Refund and cancellation policy',
      description:
        'Cancel a ClawAI subscription any time from billing settings. Access runs to the end of the paid period; refunds cover billing errors or where the law requires.',
      keywords: ['refund policy', 'cancellation policy', 'cancel subscription'],
    },
  },
};
