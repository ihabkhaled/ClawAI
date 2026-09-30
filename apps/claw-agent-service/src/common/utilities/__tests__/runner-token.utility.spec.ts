import { hashRunnerToken, issueRunnerToken, looksLikeRunnerToken } from '../runner-token.utility';

describe('runner token utility', () => {
  it('issues a prefixed high-entropy token whose digest is what gets stored', () => {
    const issued = issueRunnerToken();
    expect(issued.token.startsWith('clwr_')).toBe(true);
    expect(issued.token.length).toBeGreaterThanOrEqual(5 + 43);
    expect(issued.tokenHash).toBe(hashRunnerToken(issued.token));
    expect(issued.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(issued.tokenHash).not.toContain(issued.token);
    expect(issued.tokenPrefix).toBe(issued.token.slice(0, 11));
  });

  it('never issues the same token twice', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => issueRunnerToken().token));
    expect(tokens.size).toBe(50);
  });

  it('recognises only runner-shaped tokens', () => {
    expect(looksLikeRunnerToken(issueRunnerToken().token)).toBe(true);
    expect(looksLikeRunnerToken('clwr_')).toBe(false);
    expect(looksLikeRunnerToken('eyJhbGciOi.e30.sig')).toBe(false);
  });
});
