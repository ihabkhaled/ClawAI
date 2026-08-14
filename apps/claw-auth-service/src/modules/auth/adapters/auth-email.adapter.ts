import { Injectable } from '@nestjs/common';
import { createSmtpEmailTransport, type SmtpConfig } from '@claw/shared-utilities/email';
import { DeploymentState, type DeploymentStatusDocument } from '@claw/shared-types';
import { AppConfig, type AppConfigType } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';

@Injectable()
export class AuthEmailAdapter {
  async sendVerification(email: string, rawToken: string): Promise<void> {
    const config = AppConfig.get();
    const smtp = this.resolveSmtpConfig(config);
    if (!smtp) {
      throw new BusinessException('Email delivery is unavailable', 'EMAIL_DELIVERY_UNAVAILABLE');
    }
    const url = new URL('/verify-email', config.PUBLIC_SITE_URL);
    url.searchParams.set('token', rawToken);
    const transport = createSmtpEmailTransport(smtp);
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
    const smtp = this.resolveSmtpConfig(config);
    if (!smtp) {
      throw new BusinessException('Email delivery is unavailable', 'EMAIL_DELIVERY_UNAVAILABLE');
    }
    const loginUrl = new URL('/login', config.PUBLIC_SITE_URL).toString();
    const transport = createSmtpEmailTransport(smtp);
    await transport.send({
      from: config.CONTACT_EMAIL_FROM,
      to: email,
      subject: 'Your temporary ClawAI password',
      text: `Temporary password: ${temporaryPassword}\nSign in: ${loginUrl}`,
      html: `<p>Temporary password: <strong>${temporaryPassword}</strong></p><p><a href="${loginUrl}">Sign in</a></p>`,
    });
  }

  async sendPasswordReset(email: string, rawToken: string): Promise<void> {
    const config = AppConfig.get();
    const smtp = this.resolveSmtpConfig(config);
    if (!smtp) {
      throw new BusinessException('Email delivery is unavailable', 'EMAIL_DELIVERY_UNAVAILABLE');
    }
    const url = new URL('/reset-password', config.PUBLIC_SITE_URL);
    url.searchParams.set('token', rawToken);
    const transport = createSmtpEmailTransport(smtp);
    await transport.send({
      from: config.CONTACT_EMAIL_FROM,
      to: email,
      subject: 'Reset your ClawAI password',
      text: `Reset your password: ${url.toString()}`,
      html: `<p>Reset your password:</p><p><a href="${url.toString()}">Reset password</a></p>`,
    });
  }

  async sendDeploymentNotification(status: DeploymentStatusDocument): Promise<boolean> {
    const config = AppConfig.get();
    const smtp = this.resolveSmtpConfig(config);
    if (!smtp || !config.CONTACT_EMAIL_TO) return false;
    const outcome = status.state === DeploymentState.COMPLETED ? 'completed' : 'failed';
    const version = status.version ? `v${status.version}` : 'unknown version';
    const details = [
      `Outcome: ${outcome}`,
      `Version: ${version}`,
      `Commit: ${status.targetSha}`,
      `Started: ${status.startedAt}`,
      `Finished: ${status.completedAt ?? status.updatedAt}`,
      `Workflow: ${status.workflowUrl ?? 'not available'}`,
    ].join('\n');
    await createSmtpEmailTransport(smtp).send({
      from: config.CONTACT_EMAIL_FROM,
      to: config.CONTACT_EMAIL_TO,
      subject: `ClawAI production deployment ${outcome} — ${version}`,
      text: details,
      html: `<p>ClawAI production deployment <strong>${outcome}</strong>.</p><pre>${details}</pre>`,
    });
    return true;
  }

  private resolveSmtpConfig(config: AppConfigType): SmtpConfig | null {
    if (
      config.CONTACT_EMAIL_ENABLED !== 'true' ||
      config.CONTACT_EMAIL_PROVIDER !== 'smtp' ||
      !config.CONTACT_SMTP_HOST ||
      !config.CONTACT_SMTP_USER ||
      !config.CONTACT_SMTP_PASS
    ) {
      return null;
    }
    return {
      host: config.CONTACT_SMTP_HOST,
      port: config.CONTACT_SMTP_PORT,
      secure: config.CONTACT_SMTP_SECURE === 'true',
      user: config.CONTACT_SMTP_USER,
      pass: config.CONTACT_SMTP_PASS,
    };
  }
}
