import { scanForSecrets } from '../utilities/secret-scanner.utility';

describe('scanForSecrets', () => {
  it('flags AWS access key id', () => {
    const result = scanForSecrets('aws key: AKIAIOSFODNN7EXAMPLE');
    expect(result.hasSecret).toBe(true);
  });

  it('flags AWS secret access key form', () => {
    const result = scanForSecrets('aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    expect(result.hasSecret).toBe(true);
  });

  it('flags PEM private key block', () => {
    const text = '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----';
    expect(scanForSecrets(text).hasSecret).toBe(true);
  });

  it('flags OpenAI-style sk-... tokens', () => {
    expect(scanForSecrets('OPENAI_KEY=sk-abcdefghijklmnopqrstuvwxyz12345').hasSecret).toBe(true);
  });

  it('flags GitHub PAT ghp_...', () => {
    expect(scanForSecrets('GH=ghp_abcdefghijklmnopqrstuvwxyz123456').hasSecret).toBe(true);
  });

  it('flags Slack bot token', () => {
    expect(scanForSecrets('SLACK=xoxb-1234567890-abcdefghijkl').hasSecret).toBe(true);
  });

  it('does not flag benign text', () => {
    const result = scanForSecrets(
      'Implement the feature: read the file, transform, write it back. Use TypeScript strict.',
    );
    expect(result.hasSecret).toBe(false);
    expect(result.matchedPatternIndex).toBeNull();
  });

  it('returns first matched pattern index when multiple match', () => {
    const text = 'AKIAIOSFODNN7EXAMPLE and ghp_abcdefghijklmnopqrstuvwxyz123456';
    const result = scanForSecrets(text);
    expect(result.hasSecret).toBe(true);
    expect(result.matchedPatternIndex).toBe(0);
  });
});
