import { describe, expect, it } from 'vitest';

import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';

describe('PublicLaunchPageSlug enum', () => {
  it('carries the delivery and refund policies as path-shaped slugs', () => {
    expect(PublicLaunchPageSlug.DELIVERY_SHIPPING).toBe('delivery-shipping');
    expect(PublicLaunchPageSlug.REFUND_CANCELLATION).toBe('refund-cancellation');
  });

  it('has unique values', () => {
    const values = Object.values(PublicLaunchPageSlug);
    expect(new Set(values).size).toBe(values.length);
  });
});
