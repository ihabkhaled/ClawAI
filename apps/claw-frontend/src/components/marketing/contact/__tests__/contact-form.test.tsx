import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactForm } from '@/components/marketing/contact/contact-form';
import { ContactResponseCode } from '@/enums/contact-response-code.enum';

const submitMock = vi.fn();

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

vi.mock('@/repositories/contact/contact.repository', () => ({
  contactRepository: { submit: (values: unknown) => submitMock(values) },
  ContactSubmitError: class extends Error {},
}));

vi.mock('@/utilities', () => ({
  showToast: { success: vi.fn(), error: vi.fn() },
}));

function renderForm(): void {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ContactForm />
    </QueryClientProvider>,
  );
}

describe('ContactForm', () => {
  beforeEach(() => {
    submitMock.mockReset();
  });

  it('renders all fields and a visually hidden honeypot', () => {
    renderForm();
    expect(screen.getByLabelText('marketing.contact.nameLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('marketing.contact.emailLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('marketing.contact.messageLabel')).toBeInTheDocument();
    const honeypot = screen.getByLabelText('Company');
    expect(honeypot).toHaveAttribute('tabindex', '-1');
  });

  it('submits sanitized values and shows the success view', async () => {
    submitMock.mockResolvedValue({ code: ContactResponseCode.DELIVERED });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('marketing.contact.nameLabel'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('marketing.contact.emailLabel'), 'ada@example.com');
    await user.type(screen.getByLabelText('marketing.contact.subjectLabel'), 'Hello');
    await user.type(
      screen.getByLabelText('marketing.contact.messageLabel'),
      'This is a message longer than ten characters.',
    );
    await user.click(screen.getByRole('button', { name: 'marketing.contact.submit' }));

    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('marketing.contact.successTitle')).toBeInTheDocument();
    const submittedValues = submitMock.mock.calls[0]?.[0] as { name: string; elapsedMs: number };
    expect(submittedValues.name).toBe('Ada Lovelace');
    expect(typeof submittedValues.elapsedMs).toBe('number');
  });

  it('does not submit when required fields are empty', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'marketing.contact.submit' }));
    await waitFor(() => {
      expect(screen.getByText('marketing.contact.nameRequired')).toBeInTheDocument();
    });
    expect(submitMock).not.toHaveBeenCalled();
  });
});
