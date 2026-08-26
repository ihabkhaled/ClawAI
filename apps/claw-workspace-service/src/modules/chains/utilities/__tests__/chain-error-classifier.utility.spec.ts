import { classifyChainStepError } from '../chain-error-classifier.utility';

describe('classifyChainStepError', () => {
  it('classifies unresolved DSL placeholders as VALIDATION', () => {
    expect(classifyChainStepError('unresolved placeholders: steps.x.output.id')).toBe('VALIDATION');
  });

  it('classifies RBAC denial as PERMISSION', () => {
    expect(classifyChainStepError('no access to connector c1')).toBe('PERMISSION');
    expect(classifyChainStepError('Provider returned HTTP 403 Forbidden')).toBe('PERMISSION');
  });

  it('classifies missing/invalid tokens as AUTH', () => {
    expect(classifyChainStepError('could not resolve a valid token for connector c1')).toBe('AUTH');
    expect(classifyChainStepError('connector c1 missing or unauthenticated')).toBe('AUTH');
    expect(classifyChainStepError('GitHub API error: HTTP 401 Unauthorized')).toBe('AUTH');
  });

  it('classifies 429/rate-limit responses as RATE_LIMIT', () => {
    expect(classifyChainStepError('Jira API error: HTTP 429')).toBe('RATE_LIMIT');
    expect(classifyChainStepError('request throttled, try later')).toBe('RATE_LIMIT');
  });

  it('classifies 409/already-exists as CONFLICT', () => {
    expect(classifyChainStepError('Slack API error: HTTP 409 conflict')).toBe('CONFLICT');
    expect(classifyChainStepError('resource already exists')).toBe('CONFLICT');
  });

  it('classifies 400/invalid payload as VALIDATION', () => {
    expect(classifyChainStepError('Jira API error: HTTP 400')).toBe('VALIDATION');
    expect(classifyChainStepError('invalid payload shape')).toBe('VALIDATION');
  });

  it('classifies 5xx/network failures as TRANSIENT', () => {
    expect(classifyChainStepError('GitLab API error: HTTP 503')).toBe('TRANSIENT');
    expect(classifyChainStepError('network timeout while calling provider')).toBe('TRANSIENT');
    expect(classifyChainStepError('ECONNRESET')).toBe('TRANSIENT');
  });

  it('falls back to PERMANENT for anything unrecognized', () => {
    expect(classifyChainStepError('adapter returned success=false')).toBe('PERMANENT');
    expect(classifyChainStepError('provider JIRA has no executeWriteAction')).toBe('PERMANENT');
  });

  it('is case-insensitive', () => {
    expect(classifyChainStepError('HTTP 429 RATE LIMITED')).toBe('RATE_LIMIT');
  });
});
