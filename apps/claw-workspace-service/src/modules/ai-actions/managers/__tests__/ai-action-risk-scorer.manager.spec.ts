import { AiActionRiskLabel } from '../../../../common/enums/ai-action-risk-label.enum';
import { AiActionRiskScorerManager } from '../ai-action-risk-scorer.manager';

describe('AiActionRiskScorerManager', () => {
  const scorer = new AiActionRiskScorerManager();

  it('returns LOW for short benign internal body', () => {
    const result = scorer.assess({ body: 'Hello team, lunch at 12.' });
    expect(result.riskLabel).toBe(AiActionRiskLabel.LOW);
    expect(result.riskScore).toBeLessThan(30);
    expect(result.reasons.length).toBeLessThanOrEqual(0);
  });

  it('flags AWS access key as CRITICAL', () => {
    const result = scorer.assess({
      body: 'Use this key: AKIAIOSFODNN7EXAMPLE for the build',
    });
    expect(result.riskLabel).toBe(AiActionRiskLabel.CRITICAL);
    expect(result.reasons.some((r) => r.includes('aws-access-key'))).toBe(true);
  });

  it('flags GitHub PAT as CRITICAL', () => {
    const result = scorer.assess({
      body: 'token: ghp_1234567890abcdefghijklmnopqrstuvwxyz12',
    });
    expect(result.riskLabel).toBe(AiActionRiskLabel.CRITICAL);
  });

  it('flags credit card as MEDIUM/HIGH', () => {
    const result = scorer.assess({ body: 'card 4111 1111 1111 1111 expires 12/30' });
    expect([AiActionRiskLabel.MEDIUM, AiActionRiskLabel.HIGH]).toContain(result.riskLabel);
  });

  it('flags external recipient', () => {
    const result = scorer.assess({
      body: 'Hi there.',
      to: 'random@example.com',
    });
    expect(result.reasons.some((r) => r.includes('external'))).toBe(true);
    expect(result.riskScore).toBeGreaterThan(0);
  });

  it('does not flag internal claw.local recipient', () => {
    const result = scorer.assess({
      body: 'Hi there.',
      to: 'team@claw.local',
    });
    expect(result.reasons.some((r) => r.includes('external'))).toBe(false);
  });

  it('caps score at 100', () => {
    const longBodyWithSecrets =
      'AKIAIOSFODNN7EXAMPLE '.repeat(20) + 'ghp_1234567890abcdefghijklmnopqrstuvwxyz12 '.repeat(20);
    const result = scorer.assess({ body: longBodyWithSecrets });
    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(result.riskLabel).toBe(AiActionRiskLabel.CRITICAL);
  });

  it('flags long bodies', () => {
    const longBody = 'a'.repeat(6000);
    const result = scorer.assess({ body: longBody });
    expect(result.reasons.some((r) => r.includes('length'))).toBe(true);
  });

  it('flags HTML bodies', () => {
    const result = scorer.assess({ body: '<div>hello</div>' });
    expect(result.reasons.some((r) => r.includes('HTML'))).toBe(true);
  });

  it('handles arrays of recipients', () => {
    const result = scorer.assess({
      body: 'Hi.',
      to: ['external@gmail.com', 'someone@claw.local'],
    });
    expect(result.reasons.some((r) => r.includes('external'))).toBe(true);
  });
});
