import { evaluateSnapshotSafety, resolveAdsEligibility } from '../snapshot-safety.utility';
import { SnapshotSafetyReason } from '../../enums/snapshot-safety-reason.enum';
import { ChatShareSafetyStatus, MessageRole } from '../../../../generated/prisma';
import { type SnapshotMessage } from '../../types/chat-shares.types';

function makeSnapshot(contents: string[]): SnapshotMessage[] {
  return contents.map((content, index) => ({
    sequence: index,
    role: index % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
    content,
    providerLabel: null,
    modelLabel: null,
    originalCreatedAt: new Date('2026-07-01T10:00:00.000Z'),
    assetSources: [],
  }));
}

// Long enough to clear the content threshold on its own.
const FILLER = 'This is a substantial paragraph about configuring infrastructure. '.repeat(4);

function cleanSnapshot(): SnapshotMessage[] {
  return makeSnapshot([FILLER, FILLER, FILLER, FILLER]);
}

describe('evaluateSnapshotSafety', () => {
  it('approves a substantial, clean conversation', () => {
    const result = evaluateSnapshotSafety(cleanSnapshot());

    expect(result.status).toBe(ChatShareSafetyStatus.APPROVED);
    expect(result.reasons).toEqual([]);
    expect(result.meetsContentThreshold).toBe(true);
  });

  describe('secret detection', () => {
    it.each([
      ['AWS access key', 'AKIAIOSFODNN7EXAMPLE'],
      ['GitHub token', `ghp_${'a'.repeat(36)}`],
      ['OpenAI key', `sk-${'a'.repeat(40)}`],
      ['Anthropic key', `sk-ant-${'a'.repeat(40)}`],
      ['Google API key', `AIza${'a'.repeat(35)}`],
      ['Slack token', `xoxb-${'1'.repeat(20)}`],
      ['Stripe key', `sk_live_${'a'.repeat(30)}`],
      ['PEM private key', '-----BEGIN RSA PRIVATE KEY-----'],
      ['postgres URL with password', 'postgresql://admin:s3cr3tpass@db.internal:5432/prod'],
      ['explicit assignment', 'api_key = abcdefghijklmnopqrstuvwx'],
    ])('flags a %s', (_label, secret) => {
      const result = evaluateSnapshotSafety(
        makeSnapshot([FILLER, `${FILLER} ${secret}`, FILLER, FILLER]),
      );

      expect(result.reasons).toContain(SnapshotSafetyReason.POSSIBLE_SECRET);
      // Not rejected outright — the owner may still share it unlisted. It just
      // does not go into a search index with an apparent credential in it.
      expect(result.status).toBe(ChatShareSafetyStatus.REQUIRES_REVIEW);
    });

    it('never returns the matched secret in the reasons', () => {
      // Echoing a detected secret into a response or a log is exactly the leak
      // this scan exists to prevent.
      const secret = `sk-${'z'.repeat(40)}`;
      const result = evaluateSnapshotSafety(makeSnapshot([FILLER, secret, FILLER, FILLER]));

      expect(JSON.stringify(result)).not.toContain(secret);
      expect(JSON.stringify(result)).not.toContain('zzzz');
    });
  });

  describe('PII detection', () => {
    it('flags an email address', () => {
      const result = evaluateSnapshotSafety(
        makeSnapshot([FILLER, `${FILLER} contact me at person@example.com`, FILLER, FILLER]),
      );

      expect(result.reasons).toContain(SnapshotSafetyReason.POSSIBLE_PII);
      expect(result.status).toBe(ChatShareSafetyStatus.REQUIRES_REVIEW);
    });

    it('flags a card-shaped number', () => {
      const result = evaluateSnapshotSafety(
        makeSnapshot([FILLER, `${FILLER} 4111 1111 1111 1111`, FILLER, FILLER]),
      );

      expect(result.reasons).toContain(SnapshotSafetyReason.POSSIBLE_PII);
    });
  });

  describe('content threshold', () => {
    it('rejects a thin conversation for indexing', () => {
      // A two-line exchange is not a page worth putting in a search index, and
      // thin content is what an ad network penalises a whole site for.
      const result = evaluateSnapshotSafety(makeSnapshot(['hi', 'hello']));

      expect(result.meetsContentThreshold).toBe(false);
      expect(result.reasons).toContain(SnapshotSafetyReason.INSUFFICIENT_CONTENT);
      // Thin is not UNSAFE — it stays PENDING rather than demanding a review.
      expect(result.status).toBe(ChatShareSafetyStatus.PENDING);
    });

    it('rejects a long conversation of trivially short messages', () => {
      const result = evaluateSnapshotSafety(makeSnapshot(['ok', 'yes', 'no', 'sure', 'thanks']));

      expect(result.meetsContentThreshold).toBe(false);
    });

    it('handles an empty snapshot without throwing', () => {
      const result = evaluateSnapshotSafety([]);

      expect(result.meetsContentThreshold).toBe(false);
      expect(result.status).toBe(ChatShareSafetyStatus.PENDING);
    });
  });

  it('reports both a secret and thin content when both apply', () => {
    const result = evaluateSnapshotSafety(makeSnapshot([`sk-${'a'.repeat(40)}`, 'ok']));

    expect(result.reasons).toContain(SnapshotSafetyReason.POSSIBLE_SECRET);
    expect(result.reasons).toContain(SnapshotSafetyReason.INSUFFICIENT_CONTENT);
    // A suspected secret outranks thin content: it needs a human.
    expect(result.status).toBe(ChatShareSafetyStatus.REQUIRES_REVIEW);
  });
});

describe('resolveAdsEligibility', () => {
  it('allows ads only on approved, substantial content', () => {
    expect(resolveAdsEligibility(ChatShareSafetyStatus.APPROVED, true)).toBe(true);
  });

  it.each([
    [ChatShareSafetyStatus.APPROVED, false],
    [ChatShareSafetyStatus.PENDING, true],
    [ChatShareSafetyStatus.REQUIRES_REVIEW, true],
    [ChatShareSafetyStatus.REJECTED, true],
  ])('fails closed for status=%s threshold=%s', (status, meetsThreshold) => {
    // Every condition must hold. A URL matching /share/chat/* is never enough
    // on its own to become an ad surface.
    expect(resolveAdsEligibility(status, meetsThreshold)).toBe(false);
  });
});
