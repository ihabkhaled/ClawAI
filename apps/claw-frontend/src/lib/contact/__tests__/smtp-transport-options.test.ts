import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildSmtpTransportOptions } from '@/lib/contact/transports/smtp-email-transport';

const smtp = (overrides: Partial<Parameters<typeof buildSmtpTransportOptions>[0]> = {}) => ({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  user: 'user',
  pass: 'pass',
  ...overrides,
});

describe('SMTP transport options', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses STARTTLS on the submission port', () => {
    const options = buildSmtpTransportOptions(smtp({ port: 587 }));
    expect(options.secure).toBe(false);
    expect(options.requireTLS).toBe(true);
  });

  it('uses implicit TLS on port 465', () => {
    const options = buildSmtpTransportOptions(smtp({ port: 465, secure: true }));
    expect(options.secure).toBe(true);
    expect(options.requireTLS).toBe(false);
  });

  it('corrects secure=true on port 587 instead of failing delivery', () => {
    // This exact combination produces
    // "SSL routines:tls_validate_record_header:wrong version number" —
    // nodemailer sends a TLS ClientHello and the server replies with a
    // plaintext SMTP greeting.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const options = buildSmtpTransportOptions(smtp({ port: 587, secure: true }));
    expect(options.secure).toBe(false);
    expect(options.requireTLS).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('CONTACT_SMTP_SECURE=true'));
  });

  it('does not warn when the configuration is already correct', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    buildSmtpTransportOptions(smtp({ port: 587, secure: false }));
    buildSmtpTransportOptions(smtp({ port: 465, secure: true }));
    expect(warn).not.toHaveBeenCalled();
  });

  it('always demands encryption — credentials never travel in the clear', () => {
    // Either implicit TLS or a mandatory STARTTLS upgrade; never plain SMTP.
    for (const port of [25, 587, 465, 2525]) {
      const options = buildSmtpTransportOptions(smtp({ port }));
      expect(options.secure || options.requireTLS).toBe(true);
    }
  });

  it('passes host and credentials through unchanged', () => {
    const options = buildSmtpTransportOptions(smtp());
    expect(options.host).toBe('smtp-relay.brevo.com');
    expect(options.auth).toEqual({ user: 'user', pass: 'pass' });
  });
});
