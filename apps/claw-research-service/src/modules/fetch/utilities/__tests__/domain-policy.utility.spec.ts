import { DomainPolicyOutcome } from '../../enums/domain-policy-outcome.enum';
import { evaluateDomainPolicy } from '../domain-policy.utility';

describe('evaluateDomainPolicy', () => {
  it('allows any domain when neither list is configured', () => {
    const result = evaluateDomainPolicy('https://example.com/x', [], []);
    expect(result.outcome).toBe(DomainPolicyOutcome.ALLOWED);
    expect(result.reason).toBeUndefined();
  });

  it('allows a domain that is on the allowlist', () => {
    const result = evaluateDomainPolicy('https://github.com/a/b', ['github.com'], []);
    expect(result.outcome).toBe(DomainPolicyOutcome.ALLOWED);
  });

  it('rejects a domain that is not on a non-empty allowlist', () => {
    const result = evaluateDomainPolicy('https://evil.example/x', ['github.com'], []);
    expect(result.outcome).toBe(DomainPolicyOutcome.NOT_ALLOWED);
    expect(result.reason).toContain('allowlist');
  });

  it('blocks a domain that is on the blocklist regardless of allowlist', () => {
    const result = evaluateDomainPolicy('https://bad.example/x', ['bad.example'], ['bad.example']);
    expect(result.outcome).toBe(DomainPolicyOutcome.BLOCKED);
  });

  it('matches wildcard entries in the blocklist', () => {
    const result = evaluateDomainPolicy('https://api.badco.com/x', [], ['*.badco.com']);
    expect(result.outcome).toBe(DomainPolicyOutcome.BLOCKED);
  });

  it('matches wildcard entries in the allowlist', () => {
    const result = evaluateDomainPolicy('https://docs.github.com/x', ['*.github.com'], []);
    expect(result.outcome).toBe(DomainPolicyOutcome.ALLOWED);
  });

  it('does not partial-match non-wildcard entries (api.github.com is not on "github.com" allow)', () => {
    const result = evaluateDomainPolicy('https://api.github.com/x', ['github.com'], []);
    expect(result.outcome).toBe(DomainPolicyOutcome.NOT_ALLOWED);
  });

  it('is case-insensitive', () => {
    const result = evaluateDomainPolicy('https://GitHub.com/x', ['github.com'], []);
    expect(result.outcome).toBe(DomainPolicyOutcome.ALLOWED);
  });

  it('rejects a malformed URL', () => {
    const result = evaluateDomainPolicy('not a url', [], []);
    expect(result.outcome).toBe(DomainPolicyOutcome.INVALID_URL);
  });

  it('strips ports before matching', () => {
    const result = evaluateDomainPolicy('https://github.com:8080/x', ['github.com'], []);
    expect(result.outcome).toBe(DomainPolicyOutcome.ALLOWED);
  });

  it('blocklist wins over allowlist (even exact match on both)', () => {
    const result = evaluateDomainPolicy('https://example.com/x', ['example.com'], ['example.com']);
    expect(result.outcome).toBe(DomainPolicyOutcome.BLOCKED);
  });
});
