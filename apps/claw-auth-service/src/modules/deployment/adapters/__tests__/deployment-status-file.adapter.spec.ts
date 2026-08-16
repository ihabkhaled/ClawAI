import { readFile } from 'node:fs/promises';

import { DeploymentState } from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { DeploymentStatusFileAdapter } from '../deployment-status-file.adapter';

jest.mock('node:fs/promises', () => ({ readFile: jest.fn() }));

const SHA = 'a'.repeat(40);

describe('DeploymentStatusFileAdapter', () => {
  beforeEach(() => {
    jest.spyOn(AppConfig, 'get').mockReturnValue({
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
      PUBLIC_SITE_URL: 'https://claw.local',
      CONTACT_EMAIL_ENABLED: 'false',
      CONTACT_EMAIL_PROVIDER: 'none',
      CONTACT_EMAIL_FROM: 'no-reply@claw-ai.co',
      CONTACT_EMAIL_TO: '',
      CONTACT_SMTP_PORT: 587,
      CONTACT_SMTP_SECURE: 'false',
      DEPLOYMENT_STATUS_FILE: '/app/.deploy/status.json',
      SEED_RECONCILE_PERMISSIONS: false,
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('reads and validates the fixed configured status file', async () => {
    jest.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        state: 'completed',
        phase: 'completed',
        targetSha: SHA,
        previousSha: null,
        deployedSha: SHA,
        version: '1.15.0',
        services: ['frontend'],
        currentService: null,
        startedAt: '2026-08-13T10:29:58Z',
        updatedAt: '2026-08-13T10:49:21Z',
        completedAt: '2026-08-13T10:49:21Z',
        workflowUrl: null,
        failureCode: null,
      }),
    );

    const result = await new DeploymentStatusFileAdapter().read();

    expect(readFile).toHaveBeenCalledWith('/app/.deploy/status.json', 'utf8');
    expect(result?.state).toBe(DeploymentState.COMPLETED);
  });

  it.each([new Error('missing'), '{not-json}', JSON.stringify({ unsafe: true })])(
    'returns null for unreadable or invalid input',
    async (input) => {
      if (input instanceof Error) jest.mocked(readFile).mockRejectedValue(input);
      else jest.mocked(readFile).mockResolvedValue(input);

      await expect(new DeploymentStatusFileAdapter().read()).resolves.toBeNull();
    },
  );
});
