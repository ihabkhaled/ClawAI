import { SMTP_IMPLICIT_TLS_PORT } from '@/constants/contact.constants';
import { ContactEmailProvider } from '@/enums/contact-email-provider.enum';
import type {
  ContactEmailPayload,
  ContactEmailTransport,
  ContactSmtpConfig,
} from '@/types/contact.types';

// Real delivery via nodemailer (patched 9.x — the 7.x line had CRLF/header
// injection advisories). nodemailer is imported lazily so it is only loaded
// when SMTP is actually selected, and never pulled into other bundles.
// Header-injection defence is layered: nodemailer 9 sanitizes, AND we already
// stripped control characters when building the payload.
export function createSmtpEmailTransport(smtp: ContactSmtpConfig): ContactEmailTransport {
  return {
    provider: ContactEmailProvider.SMTP,
    async send(payload: ContactEmailPayload): Promise<void> {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport(buildSmtpTransportOptions(smtp));
      await transporter.sendMail({
        from: payload.from,
        to: payload.to,
        replyTo: payload.replyTo,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
    },
  };
}

// TLS mode is decided by the PORT, not by the operator's flag.
//
// Port 465 is implicit TLS (SMTPS): the connection is encrypted from the first
// byte. Ports 587 and 25 start in plaintext and upgrade with STARTTLS. Setting
// `secure: true` on 587 makes nodemailer send a TLS ClientHello to a server
// that is waiting to send a plaintext SMTP greeting; the server's "220 …" is
// then parsed as a TLS record and OpenSSL reports
//
//     SSL routines:tls_validate_record_header:wrong version number
//
// which reads like a certificate problem but is really a mode mismatch. That
// combination is a very common misconfiguration (Brevo, SendGrid and Mailgun
// all document 587), so it is corrected here rather than allowed to fail
// delivery in production.
//
// `requireTLS` on the submission ports makes the STARTTLS upgrade MANDATORY:
// without it, a server that does not advertise STARTTLS would be handed the
// credentials over an unencrypted connection.
export function buildSmtpTransportOptions(smtp: ContactSmtpConfig): {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth: { user: string; pass: string };
} {
  const implicitTls = smtp.port === SMTP_IMPLICIT_TLS_PORT;
  if (smtp.secure && !implicitTls) {
    // console.warn is permitted here: this runs server-side only, and a silent
    // correction would hide a real configuration error from the operator.
    console.warn(
      `[contact] CONTACT_SMTP_SECURE=true is invalid for port ${String(smtp.port)}; ` +
        `implicit TLS is only for port ${String(SMTP_IMPLICIT_TLS_PORT)}. ` +
        'Using STARTTLS instead (set CONTACT_SMTP_SECURE=false to silence this).',
    );
  }
  return {
    host: smtp.host,
    port: smtp.port,
    secure: implicitTls,
    requireTLS: !implicitTls,
    auth: { user: smtp.user, pass: smtp.pass },
  };
}
