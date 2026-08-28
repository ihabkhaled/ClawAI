import { describe, expect, it } from 'vitest';

import { buildTranscriptSignature } from '@/utilities/transcript-signature.utility';

describe('buildTranscriptSignature', () => {
  it('changes when the transcript is truncated by an edit', () => {
    // The case the suppression bug turned on: an edit deletes the answers below
    // the rewritten prompt, so the trailing message can keep its id while the
    // transcript is plainly not the one that was concluded.
    const answered = buildTranscriptSignature(4, 'message-assistant');
    const rewritten = buildTranscriptSignature(1, 'message-user');

    expect(rewritten).not.toBe(answered);
  });

  it('is stable while nothing about the transcript has changed', () => {
    // Equally load-bearing: between DONE and the refetch the transcript is
    // unchanged, and re-arming there is the spinner loop this guards against.
    expect(buildTranscriptSignature(2, 'message-user')).toBe(
      buildTranscriptSignature(2, 'message-user'),
    );
  });

  it('distinguishes an equal-length transcript ending in a different message', () => {
    expect(buildTranscriptSignature(2, 'message-a')).not.toBe(
      buildTranscriptSignature(2, 'message-b'),
    );
  });

  it('handles an empty transcript without colliding with a real message id', () => {
    expect(buildTranscriptSignature(0, null)).toBe('0:');
  });
});
