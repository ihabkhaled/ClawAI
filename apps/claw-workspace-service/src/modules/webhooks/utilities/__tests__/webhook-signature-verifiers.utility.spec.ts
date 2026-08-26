import { createHmac } from 'node:crypto';

import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { findVerifier, isWebhookSupported } from '../webhook-signature-verifiers.utility';

describe('webhook-signature-verifiers', () => {
  it('isWebhookSupported recognises 6 providers', () => {
    expect(isWebhookSupported(WorkspaceProvider.GITHUB)).toBe(true);
    expect(isWebhookSupported(WorkspaceProvider.GITLAB)).toBe(true);
    expect(isWebhookSupported(WorkspaceProvider.SLACK)).toBe(true);
    expect(isWebhookSupported(WorkspaceProvider.JIRA)).toBe(true);
    expect(isWebhookSupported(WorkspaceProvider.FIGMA)).toBe(true);
    expect(isWebhookSupported(WorkspaceProvider.BITBUCKET)).toBe(true);
    expect(isWebhookSupported(WorkspaceProvider.CONFLUENCE)).toBe(false);
  });

  describe('GitHub', () => {
    const verifier = findVerifier(WorkspaceProvider.GITHUB);
    if (verifier === null) throw new Error('GitHub verifier missing');

    it('accepts valid signature', () => {
      const secret = 'mysecret';
      const body = Buffer.from(JSON.stringify({ ref: 'refs/heads/main' }));
      const sig = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
      const result = verifier.verify(
        {
          rawBody: body,
          headers: {
            'x-hub-signature-256': sig,
            'x-github-event': 'push',
            'x-github-delivery': 'abc-123',
          },
        },
        secret,
      );
      expect(result.signatureValid).toBe(true);
      expect(result.eventType).toBe('push');
      expect(result.externalDeliveryId).toBe('abc-123');
    });

    it('rejects wrong signature', () => {
      const secret = 'mysecret';
      const body = Buffer.from('{"a":1}');
      const result = verifier.verify(
        {
          rawBody: body,
          headers: { 'x-hub-signature-256': 'sha256=deadbeef' },
        },
        secret,
      );
      expect(result.signatureValid).toBe(false);
    });

    it('rejects missing signature', () => {
      const result = verifier.verify({ rawBody: Buffer.from('{}'), headers: {} }, 'mysecret');
      expect(result.signatureValid).toBe(false);
      expect(result.reason).toBe('SIGNATURE_MISSING');
    });

    it('rejects when secret unconfigured', () => {
      const result = verifier.verify(
        { rawBody: Buffer.from('{}'), headers: { 'x-hub-signature-256': 'sha256=x' } },
        '',
      );
      expect(result.signatureValid).toBe(false);
      expect(result.reason).toBe('SECRET_NOT_CONFIGURED');
    });
  });

  describe('Slack', () => {
    const verifier = findVerifier(WorkspaceProvider.SLACK);
    if (verifier === null) throw new Error('Slack verifier missing');

    // A real (not replayed) request always carries a timestamp close to
    // "now" — Slack's own docs require verifying this. Tests use a fresh
    // timestamp so they exercise the HMAC check, not the skew check.
    const freshTimestamp = (): string => String(Math.floor(Date.now() / 1000));

    it('accepts valid v0 signature with a fresh timestamp', () => {
      const secret = 'slacksecret';
      const ts = freshTimestamp();
      const body = Buffer.from('payload=hello');
      const base = `v0:${ts}:${body.toString('utf-8')}`;
      const sig = `v0=${createHmac('sha256', secret).update(base).digest('hex')}`;
      const result = verifier.verify(
        {
          rawBody: body,
          headers: { 'x-slack-signature': sig, 'x-slack-request-timestamp': ts },
        },
        secret,
      );
      expect(result.signatureValid).toBe(true);
    });

    it('rejects wrong signature even with a fresh timestamp', () => {
      const result = verifier.verify(
        {
          rawBody: Buffer.from('payload=hello'),
          headers: { 'x-slack-signature': 'v0=bad', 'x-slack-request-timestamp': freshTimestamp() },
        },
        'slacksecret',
      );
      expect(result.signatureValid).toBe(false);
      expect(result.reason).toBe('SIGNATURE_INVALID');
    });

    // Phase 14 — regression test for the replay-window bug this phase
    // found and fixed: a validly-signed-but-old payload used to be
    // accepted forever, since the signature itself never expires.
    it('rejects a validly-signed but stale timestamp (replay protection)', () => {
      const secret = 'slacksecret';
      const ts = String(Math.floor(Date.now() / 1000) - 10 * 60); // 10 minutes old
      const body = Buffer.from('payload=hello');
      const base = `v0:${ts}:${body.toString('utf-8')}`;
      const sig = `v0=${createHmac('sha256', secret).update(base).digest('hex')}`;
      const result = verifier.verify(
        {
          rawBody: body,
          headers: { 'x-slack-signature': sig, 'x-slack-request-timestamp': ts },
        },
        secret,
      );
      expect(result.signatureValid).toBe(false);
      expect(result.reason).toBe('SIGNATURE_TIMESTAMP_EXPIRED');
    });

    it('rejects a non-numeric timestamp', () => {
      const result = verifier.verify(
        {
          rawBody: Buffer.from('payload=hello'),
          headers: {
            'x-slack-signature': 'v0=whatever',
            'x-slack-request-timestamp': 'not-a-number',
          },
        },
        'slacksecret',
      );
      expect(result.signatureValid).toBe(false);
      expect(result.reason).toBe('SIGNATURE_TIMESTAMP_EXPIRED');
    });

    it('rejects a missing timestamp', () => {
      const result = verifier.verify(
        {
          rawBody: Buffer.from('payload=hello'),
          headers: { 'x-slack-signature': 'v0=whatever' },
        },
        'slacksecret',
      );
      expect(result.signatureValid).toBe(false);
      expect(result.reason).toBe('SIGNATURE_MISSING');
    });

    it('rejects when secret unconfigured', () => {
      const result = verifier.verify(
        {
          rawBody: Buffer.from('payload=hello'),
          headers: {
            'x-slack-signature': 'v0=whatever',
            'x-slack-request-timestamp': freshTimestamp(),
          },
        },
        '',
      );
      expect(result.signatureValid).toBe(false);
      expect(result.reason).toBe('SECRET_NOT_CONFIGURED');
    });
  });

  describe('GitLab', () => {
    const verifier = findVerifier(WorkspaceProvider.GITLAB);
    if (verifier === null) throw new Error('GitLab verifier missing');

    it('accepts matching token', () => {
      const result = verifier.verify(
        {
          rawBody: Buffer.from('{}'),
          headers: { 'x-gitlab-token': 'sekret', 'x-gitlab-event': 'Push Hook' },
        },
        'sekret',
      );
      expect(result.signatureValid).toBe(true);
      expect(result.eventType).toBe('Push Hook');
    });

    it('rejects mismatched token', () => {
      const result = verifier.verify(
        {
          rawBody: Buffer.from('{}'),
          headers: { 'x-gitlab-token': 'wrong' },
        },
        'sekret',
      );
      expect(result.signatureValid).toBe(false);
    });
  });
});
