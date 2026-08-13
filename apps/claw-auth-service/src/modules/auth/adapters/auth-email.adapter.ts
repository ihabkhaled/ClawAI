import { Injectable } from '@nestjs/common';
import { createSmtpEmailTransport } from '@claw/shared-utilities/email';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';

@Injectable()
export class AuthEmailAdapter {
  async sendVerification(email: string, rawToken: string): Promise<void> {
    const config = AppConfig.get();
    if (
      config.CONTACT_EMAIL_ENABLED !== 'true' ||
      config.CONTACT_EMAIL_PROVIDER !== 'smtp' ||
      !config.CONTACT_SMTP_HOST ||
      !config.CONTACT_SMTP_USER ||
      !config.CONTACT_SMTP_PASS
    ) {
      throw new BusinessException('Email delivery is unavailable', 'EMAIL_DELIVERY_UNAVAILABLE');
    }
    const url = new URL('/verify-email', config.PUBLIC_SITE_URL);
    url.searchParams.set('token', rawToken);
    const transport = createSmtpEmailTransport({
      host: config.CONTACT_SMTP_HOST,
      port: config.CONTACT_SMTP_PORT,
      secure: config.CONTACT_SMTP_SECURE === 'true',
      user: config.CONTACT_SMTP_USER,
      pass: config.CONTACT_SMTP_PASS,
    });
    await transport.send({
      from: config.CONTACT_EMAIL_FROM,
      to: email,
      subject: 'Verify your ClawAI email',
      text: `Verify your email address: ${url.toString()}`,
      html: `<p>Verify your email address:</p><p><a href="${url.toString()}">Verify email</a></p>`,
    });
  }

  async sendTemporaryPassword(email: string, temporaryPassword: string): Promise<void> {
    const config = AppConfig.get();
    if (
      config.CONTACT_EMAIL_ENABLED !== 'true' ||
      config.CONTACT_EMAIL_PROVIDER !== 'smtp' ||
      !config.CONTACT_SMTP_HOST ||
      !config.CONTACT_SMTP_USER ||
      !config.CONTACT_SMTP_PASS
    ) {
      throw new BusinessException('Email delivery is unavailable', 'EMAIL_DELIVERY_UNAVAILABLE');
    }
    const loginUrl = new URL('/login', config.PUBLIC_SITE_URL).toString();
    const transport = createSmtpEmailTransport({
      host: config.CONTACT_SMTP_HOST,
      port: config.CONTACT_SMTP_PORT,
      secure: config.CONTACT_SMTP_SECURE === 'true',
      user: config.CONTACT_SMTP_USER,
      pass: config.CONTACT_SMTP_PASS,
    });
    await transport.send({
      from: config.CONTACT_EMAIL_FROM,
      to: email,
      subject: 'Your temporary ClawAI password',
      text: `Temporary password: ${temporaryPassword}\nSign in: ${loginUrl}`,
      html: `<p>Temporary password: <strong>${temporaryPassword}</strong></p><p><a href="${loginUrl}">Sign in</a></p>`,
    });
  }
}
