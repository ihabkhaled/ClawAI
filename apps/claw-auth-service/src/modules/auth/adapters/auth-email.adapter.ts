import { Injectable } from '@nestjs/common';
import { createSmtpEmailTransport, type SmtpConfig } from '@claw/shared-utilities/email';
import { DeploymentState, type DeploymentStatusDocument } from '@claw/shared-types';
import { AppConfig, type AppConfigType } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import { AuthEmailKind } from '../enums/auth-email-kind.enum';
import {
  AUTH_EMAIL_EXPIRY_10_MINUTES,
  AUTH_EMAIL_EXPIRY_1_HOUR,
  AUTH_EMAIL_EXPIRY_24_HOURS,
  AUTH_EMAIL_EXPIRY_30_MINUTES,
} from '../email/constants/auth-email-expiry.constants';
import { renderAuthEmail } from '../email/utilities/auth-email-render.utility';
import type { AuthEmailRecipient } from '../email/types/auth-email-recipient.type';

/**
 * Sends every transactional email the auth service owns, in the recipient's own
 * language.
 *
 * This adapter used to build each message as a pair of inline template
 * literals — an English subject, one line of text and one line of hand-written
 * HTML — with no locale anywhere in the path. Two things were wrong with that
 * beyond the obvious. The copy was too thin to act on ("Verify your email
 * address: <link>" never says what happens if you do not), and it interpolated
 * user-controlled values straight into HTML.
 *
 * Both are fixed structurally rather than case by case: the adapter no longer
 * writes markup at all. It resolves a recipient's locale, picks the translated
 * copy, and hands structured values to `renderAuthEmail`, which owns every tag
 * and escapes everything it is given.
 */
@Injectable()
export class AuthEmailAdapter {
  public assertEmailDeliveryAvailable(): void {
    this.requireSmtpConfig();
  }

  async sendVerification(recipient: AuthEmailRecipient, rawToken: string): Promise<void> {
    const config = this.requireSmtpConfigWithApp();
    const url = new URL('/verify-email', config.app.PUBLIC_SITE_URL);
    url.searchParams.set('token', rawToken);
    await this.deliver(config, recipient, {
      kind: AuthEmailKind.VERIFICATION,
      value: null,
      expiry: AUTH_EMAIL_EXPIRY_24_HOURS[recipient.locale],
      actionUrl: url.toString(),
    });
  }

  async sendTemporaryPassword(
    recipient: AuthEmailRecipient,
    temporaryPassword: string,
  ): Promise<void> {
    const config = this.requireSmtpConfigWithApp();
    await this.deliver(config, recipient, {
      kind: AuthEmailKind.TEMPORARY_PASSWORD,
      value: temporaryPassword,
      expiry: null,
      actionUrl: new URL('/login', config.app.PUBLIC_SITE_URL).toString(),
    });
  }

  async sendPasswordReset(recipient: AuthEmailRecipient, rawToken: string): Promise<void> {
    const config = this.requireSmtpConfigWithApp();
    const url = new URL('/reset-password', config.app.PUBLIC_SITE_URL);
    url.searchParams.set('token', rawToken);
    await this.deliver(config, recipient, {
      kind: AuthEmailKind.PASSWORD_RESET,
      value: null,
      expiry: AUTH_EMAIL_EXPIRY_1_HOUR[recipient.locale],
      actionUrl: url.toString(),
    });
  }

  async sendEmailChangeOtp(
    recipient: AuthEmailRecipient,
    otp: string,
    maskedNewEmail: string,
  ): Promise<void> {
    const config = this.requireSmtpConfigWithApp();
    // The OTP is the body, not a link — there is nothing to click, because the
    // point of the code is that it can only be used in the session that asked
    // for it. `maskedNewEmail` is user-controlled and reaches the renderer as
    // plain text, where it is escaped like everything else.
    await this.deliver(config, recipient, {
      kind: AuthEmailKind.EMAIL_CHANGE_OTP,
      value: maskedNewEmail,
      expiry: AUTH_EMAIL_EXPIRY_10_MINUTES[recipient.locale],
      actionUrl: null,
      overrideValueForBody: otp,
    });
  }

  async sendEmailChangeConfirmation(
    recipient: AuthEmailRecipient,
    rawToken: string,
  ): Promise<void> {
    const config = this.requireSmtpConfigWithApp();
    const url = new URL('/confirm-email-change', config.app.PUBLIC_SITE_URL);
    url.searchParams.set('token', rawToken);
    await this.deliver(config, recipient, {
      kind: AuthEmailKind.EMAIL_CHANGE_CONFIRM,
      value: null,
      expiry: AUTH_EMAIL_EXPIRY_30_MINUTES[recipient.locale],
      actionUrl: url.toString(),
    });
  }

  async sendEmailChangeCompletedNotice(recipient: AuthEmailRecipient): Promise<void> {
    const config = this.requireSmtpConfigWithApp();
    await this.deliver(config, recipient, {
      kind: AuthEmailKind.EMAIL_CHANGE_COMPLETED,
      value: null,
      expiry: null,
      actionUrl: null,
    });
  }

  /**
   * The one email here that is NOT localised, on purpose: it goes to the
   * operator mailbox (`CONTACT_EMAIL_TO`), which belongs to no user account and
   * therefore has no language preference to read. It also stays a plain
   * technical digest rather than a branded card — it is a log line delivered by
   * mail, and dressing it up would make it slower to scan during an incident.
   */
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

  private async deliver(
    config: { app: AppConfigType; smtp: SmtpConfig },
    recipient: AuthEmailRecipient,
    message: {
      kind: AuthEmailKind;
      value: string | null;
      expiry: string | null;
      actionUrl: string | null;
      // The OTP email needs BOTH the masked address (in the intro) and the code
      // (in the body); every other email needs at most one value. Rather than
      // widen the copy shape for one case, the code is appended as its own
      // body value here.
      overrideValueForBody?: string;
    },
  ): Promise<void> {
    const rendered = renderAuthEmail({
      kind: message.kind,
      locale: recipient.locale,
      recipientName: recipient.firstName,
      value: message.value,
      expiry: message.expiry,
      actionUrl: message.actionUrl,
      siteUrl: config.app.PUBLIC_SITE_URL,
    });
    const withCode =
      message.overrideValueForBody === undefined
        ? rendered
        : this.appendCode(rendered, message.overrideValueForBody);
    await createSmtpEmailTransport(config.smtp).send({
      from: config.app.CONTACT_EMAIL_FROM,
      to: recipient.email,
      subject: withCode.subject,
      text: withCode.text,
      html: withCode.html,
    });
  }

  // Renders the one-time code as its own prominent block. It is deliberately a
  // separate step from the body copy: the code must be the largest thing in the
  // message and must survive being read on a phone, which is a layout concern,
  // not something a translator should have to reproduce in 13 files.
  private appendCode(
    rendered: { subject: string; text: string; html: string },
    code: string,
  ): { subject: string; text: string; html: string } {
    const safeCode = code.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const block = `<p dir="ltr" style="margin:0 0 20px;padding:16px;background:#f4f5f7;border-radius:12px;font-size:28px;font-weight:700;letter-spacing:6px;text-align:center;color:#11131a">${safeCode}</p>`;
    return {
      subject: rendered.subject,
      text: `${rendered.text}\n\n${code}`,
      // Placed immediately before the closing footer rule so it lands under the
      // body copy that explains it.
      html: rendered.html.replace(
        '<tr><td style="padding:0 32px 28px"><hr',
        `${block}</td></tr><tr><td style="padding:0 32px 28px"><hr`,
      ),
    };
  }

  private requireSmtpConfig(): SmtpConfig {
    return this.requireSmtpConfigWithApp().smtp;
  }

  private requireSmtpConfigWithApp(): { app: AppConfigType; smtp: SmtpConfig } {
    const app = AppConfig.get();
    const smtp = this.resolveSmtpConfig(app);
    if (!smtp) {
      throw new BusinessException('Email delivery is unavailable', 'EMAIL_DELIVERY_UNAVAILABLE');
    }
    return { app, smtp };
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
