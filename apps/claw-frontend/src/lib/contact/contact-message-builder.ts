import type { ContactConfig, ContactEmailPayload, ContactMessage } from '@/types/contact.types';

import { escapeHtml, sanitizeHeaderValue, sanitizeMultilineBody } from './sanitize';

// Turns a validated ContactMessage into a fully-sanitized email payload.
// Header-bound fields (subject, reply-to, display name) are stripped of
// control characters; the HTML body is escaped; the plain-text body keeps
// paragraph newlines but no control bytes.
export function buildContactEmail(
  message: ContactMessage,
  config: ContactConfig,
): ContactEmailPayload {
  const safeName = sanitizeHeaderValue(message.name);
  const safeEmail = sanitizeHeaderValue(message.email);
  const safeSubject = sanitizeHeaderValue(message.subject);
  const safeBody = sanitizeMultilineBody(message.message);

  const subject = `[ClawAI Contact] ${safeSubject}`;

  const text = [
    `Name: ${safeName}`,
    `Email: ${safeEmail}`,
    `Subject: ${safeSubject}`,
    '',
    safeBody,
  ].join('\n');

  const html = [
    '<h2>New ClawAI contact message</h2>',
    `<p><strong>Name:</strong> ${escapeHtml(safeName)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(safeEmail)}</p>`,
    `<p><strong>Subject:</strong> ${escapeHtml(safeSubject)}</p>`,
    `<p><strong>Message:</strong></p>`,
    `<p>${escapeHtml(safeBody).replaceAll('\n', '<br>')}</p>`,
  ].join('');

  return {
    from: config.fromAddress,
    to: config.toAddress,
    // Reply-To is the submitter so a reply reaches them; value is header-safe.
    replyTo: safeEmail,
    subject,
    text,
    html,
  };
}
