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
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass },
      });
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
