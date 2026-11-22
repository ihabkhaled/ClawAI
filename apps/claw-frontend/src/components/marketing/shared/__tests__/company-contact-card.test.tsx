import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompanyContactCard } from '@/components/marketing/shared/company-contact-card';
import type * as PublicContactConstants from '@/constants/public-contact.constants';

// The phone is optional config. This suite proves the row appears, with a
// dialable href, the moment the constant is set — without setting it for real.
vi.mock('@/constants/public-contact.constants', async (importOriginal) => ({
  ...(await importOriginal<typeof PublicContactConstants>()),
  PUBLIC_CONTACT_PHONE: '+20 (2) 1234-5678',
}));

describe('CompanyContactCard', () => {
  it('renders the phone row with a tel: link when a phone is configured', () => {
    render(
      <CompanyContactCard
        title="Company details"
        emailLabel="Email"
        phoneLabel="Phone"
        addressLabel="Address"
        note="Online only."
      />,
    );

    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+20 (2) 1234-5678' })).toHaveAttribute(
      'href',
      'tel:+20212345678',
    );
    expect(screen.getByRole('link', { name: 'admin@claw-ai.co' })).toBeInTheDocument();
    expect(screen.getByText('Cairo, Egypt')).toBeInTheDocument();
  });
});
