import { createHmac } from 'node:crypto';
import {
  verifyGithubSignature,
  verifyHmacSignature,
  verifySlackSignature,
} from '../webhook-signature.utility';

describe('verifyHmacSignature', () => {
  it('accepts matching signature', () => {
    const body = '{"event":"push"}';
    const secret = 'shhh';
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyHmacSignature(body, expected, secret, 'sha256')).toBe(true);
  });

  it('rejects non-matching signature', () => {
    expect(verifyHmacSignature('body', 'deadbeef', 'secret', 'sha256')).toBe(false);
  });

  it('is constant-time (does not leak on length mismatch)', () => {
    expect(verifyHmacSignature('body', 'short', 'secret', 'sha256')).toBe(false);
  });
});

describe('verifyGithubSignature', () => {
  const secret = 'gh-webhook-secret';
  const body = '{"zen":"Hello"}';

  it('accepts valid sha256= prefix', () => {
    const sig = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
    expect(verifyGithubSignature(body, sig, secret)).toBe(true);
  });

  it('rejects missing prefix', () => {
    const sig = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyGithubSignature(body, sig, secret)).toBe(false);
  });

  it('rejects wrong algorithm', () => {
    const sig = `sha1=${createHmac('sha1', secret).update(body).digest('hex')}`;
    expect(verifyGithubSignature(body, sig, secret)).toBe(false);
  });

  it('rejects tampered body', () => {
    const sig = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
    expect(verifyGithubSignature('{"zen":"Evil"}', sig, secret)).toBe(false);
  });
});

describe('verifySlackSignature', () => {
  const signingSecret = 'slack-signing-secret';
  const timestamp = '1736000000';
  const body = 'payload=token%3Dxoxb&channel_id=C123';
  const nowWithinWindow = Number(timestamp) * 1000 + 60 * 1000;

  it('accepts a matching signature', () => {
    const basestring = `v0:${timestamp}:${body}`;
    const sig = `v0=${createHmac('sha256', signingSecret).update(basestring).digest('hex')}`;
    expect(verifySlackSignature(body, timestamp, sig, signingSecret, nowWithinWindow)).toBe(true);
  });

  it('rejects too-old timestamp (>5 minutes)', () => {
    const basestring = `v0:${timestamp}:${body}`;
    const sig = `v0=${createHmac('sha256', signingSecret).update(basestring).digest('hex')}`;
    const nowTooLate = Number(timestamp) * 1000 + 10 * 60 * 1000;
    expect(verifySlackSignature(body, timestamp, sig, signingSecret, nowTooLate)).toBe(false);
  });

  it('rejects tampered signature', () => {
    expect(
      verifySlackSignature(body, timestamp, 'v0=deadbeef', signingSecret, nowWithinWindow),
    ).toBe(false);
  });
});
