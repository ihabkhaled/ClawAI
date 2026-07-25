import { CONTACT_MIN_ELAPSED_MS } from '@/constants/contact.constants';
import { ContactResponseCode } from '@/enums/contact-response-code.enum';
import { contactSchema } from '@/lib/validation/contact.schema';
import type { ContactMessage, ContactSubmissionOutcome } from '@/types/contact.types';

import { getClientIdentifier } from './client-identifier';
import { getContactConfig } from './contact-config';
import { buildContactEmail } from './contact-message-builder';
import { resolveContactEmailTransport } from './email-transport-factory';
import { checkRateLimit } from './rate-limiter';
import { sanitizeForLog } from './sanitize';
import { isNonRoutableSenderDomain } from './sender-domain';

function outcome(
  code: ContactResponseCode,
  httpStatus: number,
  retryAfterSeconds = 0,
): ContactSubmissionOutcome {
  return { code, httpStatus, retryAfterSeconds };
}

// Pure-ish orchestration of a contact submission, independent of the HTTP
// layer so it can be unit-tested directly. Order matters: validate → honeypot
// → timing trap → rate limit → deliver. Bot traps return 200 so a bot cannot
// distinguish a trap from success.
export async function processContactSubmission(
  rawBody: unknown,
  headers: Headers,
): Promise<ContactSubmissionOutcome> {
  const parsed = contactSchema.safeParse(rawBody);
  if (!parsed.success) {
    return outcome(ContactResponseCode.INVALID, 400);
  }
  const data = parsed.data;

  // Honeypot: a real user never fills `company`.
  if (data.company !== undefined && data.company !== '') {
    return outcome(ContactResponseCode.REJECTED, 200);
  }

  // Timing trap: near-instant submits are automated.
  if (data.elapsedMs !== undefined && data.elapsedMs < CONTACT_MIN_ELAPSED_MS) {
    return outcome(ContactResponseCode.REJECTED, 200);
  }

  const config = getContactConfig();
  const decision = checkRateLimit(getClientIdentifier(headers), {
    max: config.rateLimitMax,
    windowMs: config.rateLimitWindowMs,
  });
  if (!decision.allowed) {
    return outcome(ContactResponseCode.RATE_LIMITED, 429, decision.retryAfterSeconds);
  }

  const transport = resolveContactEmailTransport(config);
  if (transport === null) {
    // Validated + accepted, but delivery is disabled/unconfigured.
    return outcome(ContactResponseCode.ACCEPTED_NOT_CONFIGURED, 200);
  }

  // A sender on a reserved TLD is accepted by the relay and then silently
  // dropped — the relay cannot DKIM-sign an unverifiable domain and the
  // recipient sees no MX or SPF. Reporting "delivered" in that case is worse
  // than failing, because nothing ever reveals the mail did not arrive.
  if (isNonRoutableSenderDomain(config.fromAddress)) {
    console.error(
      `[contact] refusing to send: CONTACT_EMAIL_FROM domain is not routable ` +
        `(${sanitizeForLog(config.fromAddress)}). Use an address verified with the mail provider.`,
    );
    return outcome(ContactResponseCode.ACCEPTED_NOT_CONFIGURED, 200);
  }

  const message: ContactMessage = {
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
  };

  try {
    await transport.send(buildContactEmail(message, config));
    return outcome(ContactResponseCode.DELIVERED, 200);
  } catch (error) {
    // Never leak transport internals or the message body; log a single
    // sanitized line for operators.
    console.error(
      `[contact] delivery failed via ${transport.provider}: ${sanitizeForLog(
        error instanceof Error ? error.message : 'unknown error',
      )}`,
    );
    return outcome(ContactResponseCode.ERROR, 500);
  }
}
