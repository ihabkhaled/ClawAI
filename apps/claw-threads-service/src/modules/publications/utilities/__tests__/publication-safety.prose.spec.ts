import {
  describePublicationSafety,
  evaluatePublicationSafety,
  passesLuhn,
  stripNonProse,
} from '../publication-safety.utility';

const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=1234567890123456';

describe('publication safety scans prose only', () => {
  it('does not flag a 16-digit id inside a citation URL or a link target', () => {
    const markdown = `The page [source](${FACEBOOK_URL}) says more. Also ${FACEBOOK_URL} again.`;
    expect(evaluatePublicationSafety(markdown, [FACEBOOK_URL])).toEqual({
      approved: true,
      reasons: [],
    });
  });

  it('does not flag evidence marker ids, single or in a comma list', () => {
    const markdown = 'A claim [a5505c418699ab68] and another [a5505c418699ab68, 0123456789abcdef].';
    expect(evaluatePublicationSafety(markdown).approved).toBe(true);
    expect(stripNonProse('x [a5505c418699ab68] y')).not.toContain('a5505');
  });

  it('does not flag a prose id that fails the Luhn check', () => {
    expect(evaluatePublicationSafety('Order 1234567890123456 shipped.').approved).toBe(true);
    expect(evaluatePublicationSafety('Tracking 4111111111111112 here.').approved).toBe(true);
  });

  it('still flags real card numbers in prose, spaced, dashed, plain and in other digit scripts', () => {
    for (const text of [
      'Card 4111111111111111 on file',
      'Card 4111 1111 1111 1111 on file',
      'Card 4111-1111-1111-1111 on file',
      'Card ٤١١١١١١١١١١١١١١١ on file',
      'Amex 378282246310005 on file',
    ]) {
      expect(evaluatePublicationSafety(text)).toEqual({
        approved: false,
        reasons: ['POSSIBLE_PII'],
      });
    }
  });

  it('does not match a card number glued inside a longer digit or letter run', () => {
    expect(evaluatePublicationSafety('x4111111111111111').approved).toBe(true);
    expect(evaluatePublicationSafety('41111111111111111111111').approved).toBe(true);
  });

  it('keeps emails, phone-like SSNs, IBANs and secrets blocked', () => {
    expect(evaluatePublicationSafety('Write to person@example.com').reasons).toEqual([
      'POSSIBLE_PII',
    ]);
    expect(evaluatePublicationSafety('SSN 123-45-6789 listed').reasons).toEqual(['POSSIBLE_PII']);
    expect(evaluatePublicationSafety('IBAN GB82WEST12345698765432 listed').reasons).toEqual([
      'POSSIBLE_PII',
    ]);
    expect(evaluatePublicationSafety(`api_key=${'A'.repeat(20)}`).reasons).toEqual([
      'POSSIBLE_SECRET',
    ]);
  });

  it('flags a secret or an email even when it hides in a citation URL', () => {
    expect(
      evaluatePublicationSafety('Fine prose.', [`https://x.test/?api_key=${'A'.repeat(20)}`])
        .reasons,
    ).toEqual(['POSSIBLE_SECRET']);
    expect(
      evaluatePublicationSafety('Fine prose.', ['https://x.test/u/me@example.com']).reasons,
    ).toEqual(['POSSIBLE_PII']);
  });

  it('validates Luhn', () => {
    expect(passesLuhn('4111111111111111')).toBe(true);
    expect(passesLuhn('4111111111111112')).toBe(false);
    expect(passesLuhn('123')).toBe(false);
  });

  it('names the flagged excerpt, masking secrets and card numbers', () => {
    const report = describePublicationSafety(
      `Intro text. Please pay with 4111 1111 1111 1111 today. Mail person@example.com. key api_key=${'B'.repeat(24)}.`,
    );
    const kinds = report.findings.map((finding) => finding.kind);
    expect(kinds).toEqual(expect.arrayContaining(['CARD', 'EMAIL', 'SECRET']));
    const joined = JSON.stringify(report.findings);
    expect(joined).toContain('4111 •••• •••• 1111');
    expect(joined).not.toContain('4111 1111 1111 1111');
    expect(joined).not.toContain('B'.repeat(24));
    expect(joined).toContain('person@example.com');
  });

  it('keeps long hostile input linear', () => {
    const started = Date.now();
    evaluatePublicationSafety('['.repeat(200_000) + '1 '.repeat(50_000));
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});
