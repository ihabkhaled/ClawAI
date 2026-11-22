import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ContactSection } from '@/components/marketing/contact/contact-section';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

// The form has its own suite; here only the direct contact details matter.
vi.mock('@/components/marketing/contact/contact-form', () => ({
  ContactForm: () => <form aria-label="contact form" />,
}));

describe('ContactSection', () => {
  it('shows the public email as a mailto link and the address, and keeps the form', () => {
    render(<ContactSection />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('marketing.contact.title');
    expect(screen.getByText('marketing.contact.directHeading')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'admin@claw-ai.co' })).toHaveAttribute(
      'href',
      'mailto:admin@claw-ai.co',
    );
    expect(screen.getByText('Cairo, Egypt')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'contact form' })).toBeInTheDocument();
  });

  it('hides the phone row while no public phone number is configured', () => {
    render(<ContactSection />);

    expect(screen.queryByText('marketing.contact.phoneLabel')).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('tel:')),
    ).toHaveLength(0);
  });
});
