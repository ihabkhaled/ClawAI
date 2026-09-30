import { isSafeArtifactFilename } from '../artifact-filename.utility';
import { generateArtifactPublicId } from '../artifact-public-id.utility';
import { containsArtifactSecret } from '../artifact-secret-scan.utility';
import { isZeroRetentionRequested } from '../zero-retention-header.utility';
import { ARTIFACT_PUBLIC_ID_PATTERN } from '../../constants/artifact.constants';

describe('artifact utilities', () => {
  describe('isSafeArtifactFilename', () => {
    it.each(['report.md', 'my file (1).html', 'données.csv'])('accepts %s', (name) => {
      expect(isSafeArtifactFilename(name)).toBe(true);
    });

    it.each(['../etc/passwd', 'dir/file.txt', 'C:\\x.txt', 'a\u0000b', 'tab\there', 'del\u007f'])(
      'refuses %j',
      (name) => {
        expect(isSafeArtifactFilename(name)).toBe(false);
      },
    );
  });

  describe('generateArtifactPublicId', () => {
    it('is 32 base64url characters and differs every call', () => {
      const ids = new Set(Array.from({ length: 200 }, () => generateArtifactPublicId()));
      expect(ids.size).toBe(200);
      for (const id of ids) expect(id).toMatch(ARTIFACT_PUBLIC_ID_PATTERN);
    });
  });

  describe('containsArtifactSecret', () => {
    it.each([
      `AKIA${'B'.repeat(16)}`,
      `ghp_${'a'.repeat(36)}`,
      `github_pat_${'a'.repeat(30)}`,
      `sk-ant-${'a'.repeat(30)}`,
      `AIza${'a'.repeat(35)}`,
      `sk_live_${'a'.repeat(24)}`,
      '-----BEGIN RSA PRIVATE KEY-----',
      'postgres://admin:hunter2@db:5432/app',
      `client_secret = "${'a'.repeat(20)}"`,
    ])('finds %s', (text) => {
      expect(containsArtifactSecret(`before\n${text}\nafter`)).toBe(true);
    });

    it('passes ordinary and already-redacted text', () => {
      expect(containsArtifactSecret('# Title\npassword = [REDACTED]\nsk-short')).toBe(false);
    });
  });

  describe('isZeroRetentionRequested', () => {
    it.each([
      [undefined, false],
      ['', false],
      ['0', false],
      ['false', false],
      [' FALSE ', false],
      ['1', true],
      ['true', true],
      ['yes', true],
    ])('%j -> %s', (value, expected) => {
      expect(isZeroRetentionRequested(value)).toBe(expected);
    });
  });
});
