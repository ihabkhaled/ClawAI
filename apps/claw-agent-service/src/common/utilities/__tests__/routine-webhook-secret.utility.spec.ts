import { deriveChannelSecret } from '../../../modules/channels/utilities/channel-signature.utility';
import { deriveRoutineWebhookSecret } from '../routine-webhook-secret.utility';

const KEY = 'a'.repeat(64);

describe('deriveRoutineWebhookSecret (F099 routine webhook)', () => {
  it('is deterministic and 64 hex characters', () => {
    const first = deriveRoutineWebhookSecret(KEY, 'routine-1', 0);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(deriveRoutineWebhookSecret(KEY, 'routine-1', 0)).toBe(first);
  });

  it('differs per routine, so one routine secret says nothing about another', () => {
    expect(deriveRoutineWebhookSecret(KEY, 'routine-1', 0)).not.toBe(
      deriveRoutineWebhookSecret(KEY, 'routine-2', 0),
    );
  });

  it('differs per version, so rotating kills the old secret', () => {
    expect(deriveRoutineWebhookSecret(KEY, 'routine-1', 0)).not.toBe(
      deriveRoutineWebhookSecret(KEY, 'routine-1', 1),
    );
  });

  it('differs per master key', () => {
    expect(deriveRoutineWebhookSecret(KEY, 'routine-1', 0)).not.toBe(
      deriveRoutineWebhookSecret('b'.repeat(64), 'routine-1', 0),
    );
  });

  it('never equals the per-user channel secret for the same id', () => {
    expect(deriveRoutineWebhookSecret(KEY, 'user-1', 0)).not.toBe(
      deriveChannelSecret(KEY, 'user-1'),
    );
  });

  it('does not confuse an id containing a colon with a version boundary', () => {
    expect(deriveRoutineWebhookSecret(KEY, 'a:1', 0)).not.toBe(
      deriveRoutineWebhookSecret(KEY, 'a', 10),
    );
  });
});
