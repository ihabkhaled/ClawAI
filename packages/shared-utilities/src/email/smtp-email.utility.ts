import nodemailer from 'nodemailer';

import { type EmailMessage, type EmailTransport, type SmtpConfig } from './email.types';

const SMTP_IMPLICIT_TLS_PORT = 465;

export function buildSmtpTransportOptions(config: SmtpConfig): {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth: { user: string; pass: string };
  disableFileAccess: true;
  disableUrlAccess: true;
} {
  const implicitTls = config.port === SMTP_IMPLICIT_TLS_PORT;
  return {
    host: config.host,
    port: config.port,
    secure: implicitTls,
    requireTLS: !implicitTls,
    auth: { user: config.user, pass: config.pass },
    // Messages accepted by this wrapper carry bytes only. Disabling alternate
    // sources prevents a future caller from turning an attachment into SSRF or
    // arbitrary local-file disclosure.
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export function createSmtpEmailTransport(config: SmtpConfig): EmailTransport {
  const transporter = nodemailer.createTransport(buildSmtpTransportOptions(config));
  return {
    async send(message: EmailMessage): Promise<void> {
      await transporter.sendMail({
        from: message.from,
        to: message.to,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
        messageId: message.messageId,
        attachments: message.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: Buffer.from(attachment.content),
          contentType: attachment.contentType,
        })),
      });
    },
  };
}
