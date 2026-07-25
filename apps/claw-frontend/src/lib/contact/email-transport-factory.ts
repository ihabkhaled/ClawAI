import { ContactEmailProvider } from '@/enums/contact-email-provider.enum';
import type { ContactConfig, ContactEmailTransport } from '@/types/contact.types';

import { createConsoleEmailTransport } from './transports/console-email-transport';
import { createSmtpEmailTransport } from './transports/smtp-email-transport';

// Resolves the delivery transport from resolved config. Returns null when the
// feature is disabled or the selected provider is not fully configured (e.g.
// SMTP selected but credentials missing) — the route treats null as
// "accepted but not delivered" rather than erroring.
export function resolveContactEmailTransport(config: ContactConfig): ContactEmailTransport | null {
  if (!config.enabled) {
    return null;
  }
  if (config.provider === ContactEmailProvider.CONSOLE) {
    return createConsoleEmailTransport();
  }
  if (config.provider === ContactEmailProvider.SMTP && config.smtp !== null) {
    return createSmtpEmailTransport(config.smtp);
  }
  return null;
}
