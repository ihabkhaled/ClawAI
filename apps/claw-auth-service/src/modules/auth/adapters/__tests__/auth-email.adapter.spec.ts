import { createSmtpEmailTransport } from '@claw/shared-utilities/email';
import {
  DeploymentPhase,
  DeploymentState,
  type DeploymentStatusDocument,
} from '@claw/shared-types';

import { AppConfig, type AppConfigType } from '../../../../app/config/app.config';
import { AuthEmailAdapter } from '../auth-email.adapter';

jest.mock('@claw/shared-utilities/email', () => ({ createSmtpEmailTransport: jest.fn() }));

const STATUS: DeploymentStatusDocument = {
  schemaVersion: 1,
  state: DeploymentState.COMPLETED,
  phase: DeploymentPhase.COMPLETED,
  targetSha: 'a'.repeat(40),
  previousSha: 'b'.repeat(40),
  deployedSha: 'a'.repeat(40),
  version: '1.15.0',
  services: ['auth-service', 'frontend'],
  currentService: null,
  startedAt: '2026-08-13T10:29:58Z',
  updatedAt: '2026-08-13T10:49:21Z',
  completedAt: '2026-08-13T10:49:21Z',
  workflowUrl: 'https://github.com/ihabkhaled/ClawAI/actions/runs/123',
  failureCode: null,
};

function emailConfig(overrides: Partial<AppConfigType> = {}): AppConfigType {
  return {
    AUTH_DATABASE_URL: 'postgresql://example',
    AUTH_PORT: 4001,
    REDIS_URL: 'redis://example',
    RABBITMQ_URL: 'amqp://example',
    JWT_SECRET: 'a'.repeat(32),
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    ENCRYPTION_KEY: 'a'.repeat(64),
    INTER_SERVICE_AUTH_TOKEN: 'b'.repeat(32),
    PAYMENT_SERVICE_URL: 'http://payment-service:4018',
    PUBLIC_SITE_URL: 'https://claw-ai.co',
    CONTACT_EMAIL_ENABLED: 'true',
    CONTACT_EMAIL_PROVIDER: 'smtp',
    CONTACT_EMAIL_FROM: 'no-reply@claw-ai.co',
    CONTACT_EMAIL_TO: 'ops@claw-ai.co',
    CONTACT_SMTP_HOST: 'smtp.example.com',
    CONTACT_SMTP_PORT: 587,
    CONTACT_SMTP_SECURE: 'false',
    CONTACT_SMTP_USER: 'smtp-user',
    CONTACT_SMTP_PASS: 'smtp-pass',
    DEPLOYMENT_STATUS_FILE: '/app/.deploy/status.json',
    SEED_RECONCILE_PERMISSIONS: false,
    ...overrides,
  };
}

describe('AuthEmailAdapter deployment notification', () => {
  const send = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppConfig, 'get').mockReturnValue(emailConfig());
    jest.mocked(createSmtpEmailTransport).mockReturnValue({ send });
    send.mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('sends a bounded completion email through the existing SMTP transport', async () => {
    await expect(new AuthEmailAdapter().sendDeploymentNotification(STATUS)).resolves.toBe(true);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@claw-ai.co',
        to: 'ops@claw-ai.co',
        subject: 'ClawAI production deployment completed — v1.15.0',
        text: expect.stringContaining(STATUS.targetSha),
      }),
    );
  });

  it.each([
    { CONTACT_EMAIL_ENABLED: 'false' as const },
    { CONTACT_EMAIL_PROVIDER: 'none' as const },
    { CONTACT_EMAIL_TO: '' },
    { CONTACT_SMTP_HOST: undefined },
  ])('returns false when deployment email is not configured: %o', async (override) => {
    jest.spyOn(AppConfig, 'get').mockReturnValue(emailConfig(override));

    await expect(new AuthEmailAdapter().sendDeploymentNotification(STATUS)).resolves.toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
