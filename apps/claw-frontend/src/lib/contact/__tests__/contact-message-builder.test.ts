import { describe, expect, it } from 'vitest';

import { ContactEmailProvider } from '@/enums/contact-email-provider.enum';
import { buildContactEmail } from '@/lib/contact/contact-message-builder';
import type { ContactConfig } from '@/types/contact.types';

const config: ContactConfig = {
  enabled: true,
  provider: ContactEmailProvider.CONSOLE,
  fromAddress: 'no-reply@claw-ai.co',
  toAddress: 'ops@claw.local',
  rateLimitMax: 3,
  rateLimitWindowMs: 3_600_000,
  smtp: null,
};

describe('buildContactEmail', () => {
  it('prefixes the subject and sets from/to/replyTo', () => {
    const email = buildContactEmail(
      { name: 'Ada', email: 'ada@example.com', subject: 'Hi', message: 'Hello there' },
      config,
    );
    expect(email.subject).toBe('[ClawAI Contact] Hi');
    expect(email.from).toBe('no-reply@claw-ai.co');
    expect(email.to).toBe('ops@claw.local');
    expect(email.replyTo).toBe('ada@example.com');
  });

  it('strips CRLF from header-bound fields (no header injection)', () => {
    const email = buildContactEmail(
      {
        name: 'Ada\r\nX-Injected: 1',
        email: 'ada@example.com\r\nBcc: victim@example.com',
        subject: 'Hi\r\nBcc: victim@example.com',
        message: 'body',
      },
      config,
    );
    // The defence is removing the CR/LF: without a newline the "Bcc:" text is
    // just inert characters on one line, never a second header.
    expect(email.subject).not.toContain('\n');
    expect(email.subject).not.toContain('\r');
    expect(email.replyTo).not.toContain('\n');
    expect(email.replyTo).not.toContain('\r');
    expect(email.replyTo.split('\n')).toHaveLength(1);
  });

  it('escapes HTML in the body (no markup injection)', () => {
    const email = buildContactEmail(
      {
        name: 'Ada',
        email: 'ada@example.com',
        subject: 'Hi',
        message: '<img src=x onerror=alert(1)>',
      },
      config,
    );
    expect(email.html).not.toContain('<img');
    expect(email.html).toContain('&lt;img');
  });

  it('preserves paragraph newlines in the plain-text body', () => {
    const email = buildContactEmail(
      { name: 'Ada', email: 'ada@example.com', subject: 'Hi', message: 'line1\nline2' },
      config,
    );
    expect(email.text).toContain('line1\nline2');
  });
});
