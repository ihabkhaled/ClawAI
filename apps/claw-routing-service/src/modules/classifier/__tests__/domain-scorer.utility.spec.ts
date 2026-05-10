import { DomainTag } from '../../../generated/prisma';
import { scoreMessageByDomain } from '../utilities/domain-scorer.utility';

describe('scoreMessageByDomain', () => {
  it('returns empty array for messages with no keyword hits', () => {
    expect(scoreMessageByDomain('hello there friend')).toEqual([]);
  });

  it('top score is the most-hit domain', () => {
    const result = scoreMessageByDomain(
      'debug this typescript function with null pointer exception in stack trace',
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.domain).toBe(DomainTag.CODING);
    expect(result[0]!.hits).toBeGreaterThanOrEqual(3);
  });

  it('breaks ties by domain priority (medical > general)', () => {
    const result = scoreMessageByDomain('patient with diagnosis and prescription');
    expect(result[0]!.domain).toBe(DomainTag.MEDICAL);
  });

  it('returns matched keywords for each scored domain', () => {
    const result = scoreMessageByDomain('debug this api endpoint');
    expect(result[0]!.matchedKeywords.length).toBeGreaterThan(0);
    expect(result[0]!.matchedKeywords).toContain('debug');
  });
});
