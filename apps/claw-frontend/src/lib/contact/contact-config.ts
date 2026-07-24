import { ContactEmailProvider } from '@/enums/contact-email-provider.enum';
import type { ContactConfig, ContactSmtpConfig } from '@/types/contact.types';

// Contact machinery is OFF by default: with no env set, `enabled` is false and
// the route validates + rate-limits but delivers nowhere (accepted_not_configured).
// Nothing here is NEXT_PUBLIC — SMTP credentials never reach the client bundle.

function parseProvider(value: string | undefined): ContactEmailProvider {
  if (value === ContactEmailProvider.SMTP) {
    return ContactEmailProvider.SMTP;
  }
  if (value === ContactEmailProvider.CONSOLE) {
    return ContactEmailProvider.CONSOLE;
  }
  return ContactEmailProvider.NONE;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readSmtpConfig(): ContactSmtpConfig | null {
  const host = process.env.CONTACT_SMTP_HOST;
  const user = process.env.CONTACT_SMTP_USER;
  const pass = process.env.CONTACT_SMTP_PASS;
  if (!host || !user || !pass) {
    return null;
  }
  return {
    host,
    port: parsePositiveInt(process.env.CONTACT_SMTP_PORT, 587),
    secure: process.env.CONTACT_SMTP_SECURE === 'true',
    user,
    pass,
  };
}

export function getContactConfig(): ContactConfig {
  const provider = parseProvider(process.env.CONTACT_EMAIL_PROVIDER);
  const enabled =
    process.env.CONTACT_EMAIL_ENABLED === 'true' && provider !== ContactEmailProvider.NONE;
  const smtp = provider === ContactEmailProvider.SMTP ? readSmtpConfig() : null;

  return {
    enabled,
    provider,
    fromAddress: process.env.CONTACT_EMAIL_FROM ?? 'no-reply@claw.local',
    toAddress: process.env.CONTACT_EMAIL_TO ?? '',
    rateLimitMax: parsePositiveInt(process.env.CONTACT_RATE_LIMIT_MAX, 3),
    rateLimitWindowMs: parsePositiveInt(process.env.CONTACT_RATE_LIMIT_WINDOW_MS, 3_600_000),
    smtp,
  };
}
