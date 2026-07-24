import { ContactEmailProvider } from '@/enums/contact-email-provider.enum';
import type { ContactEmailPayload, ContactEmailTransport } from '@/types/contact.types';

import { sanitizeForLog } from '../sanitize';

// Development/no-real-delivery transport. Records that a message would have
// been sent, with the body redacted to a single sanitized line — the raw
// message (potential PII) is never logged. console.warn is the only console
// method permitted by the frontend lint rules and is appropriate here because
// this transport signals "email not really delivered".
export function createConsoleEmailTransport(): ContactEmailTransport {
  return {
    provider: ContactEmailProvider.CONSOLE,
    async send(payload: ContactEmailPayload): Promise<void> {
      console.warn(
        `[contact] console transport — subject="${sanitizeForLog(payload.subject)}" to="${sanitizeForLog(payload.to)}" (not actually delivered)`,
      );
      return Promise.resolve();
    },
  };
}
