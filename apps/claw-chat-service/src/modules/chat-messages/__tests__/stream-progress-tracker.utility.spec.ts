import { AiStreamProgressConfidence, AiStreamStage } from '../../../common/enums';
import { StreamProgressTracker } from '../utilities/stream-progress-tracker.utility';

describe('StreamProgressTracker', () => {
  it('never decreases progress across stages', () => {
    const tracker = new StreamProgressTracker('openai', 'gpt-4o', 0, 100, 1000);
    const connecting = tracker.snapshot(AiStreamStage.CONNECTING_PROVIDER, 100).progressPercent;
    const waiting = tracker.snapshot(AiStreamStage.WAITING_FIRST_TOKEN, 200).progressPercent;
    expect(waiting).toBeGreaterThanOrEqual(connecting);
  });

  it('caps generating progress at 95 before completion', () => {
    const tracker = new StreamProgressTracker('openai', 'gpt-4o', 0, 100, 10);
    tracker.recordContentDelta(10_000, 10_000); // far exceed maxOutputTokens
    const pct = tracker.snapshot(AiStreamStage.GENERATING, 500).progressPercent;
    expect(pct).toBeLessThanOrEqual(95);
  });

  it('reaches exactly 100 only on COMPLETE with EXACT confidence', () => {
    const tracker = new StreamProgressTracker('openai', 'gpt-4o', 0, 100, 1000);
    const done = tracker.snapshot(AiStreamStage.COMPLETE, 1000);
    expect(done.progressPercent).toBe(100);
    expect(done.progressConfidence).toBe(AiStreamProgressConfidence.EXACT);
  });

  it('labels generating progress as estimated', () => {
    const tracker = new StreamProgressTracker('openai', 'gpt-4o', 0, 100, 1000);
    tracker.recordContentDelta(40, 10);
    const snap = tracker.snapshot(AiStreamStage.GENERATING, 300);
    expect(snap.progressConfidence).toBe(AiStreamProgressConfidence.ESTIMATED);
  });

  it('computes tokens/sec after first token', () => {
    const tracker = new StreamProgressTracker('openai', 'gpt-4o', 0, 100, 1000);
    tracker.recordFirstToken(100);
    tracker.recordContentDelta(400, 100);
    const snap = tracker.snapshot(AiStreamStage.GENERATING, 1100); // 1000ms of generation
    expect(snap.tokensPerSecond).toBeGreaterThan(0);
    expect(snap.timeToFirstTokenMs).toBe(100);
  });

  it('holds last percent on cancellation (does not jump to 100)', () => {
    const tracker = new StreamProgressTracker('openai', 'gpt-4o', 0, 100, 1000);
    tracker.recordContentDelta(40, 10);
    const gen = tracker.snapshot(AiStreamStage.GENERATING, 300).progressPercent;
    const cancelled = tracker.snapshot(AiStreamStage.CANCELLED, 400).progressPercent;
    expect(cancelled).toBe(gen);
    expect(cancelled).toBeLessThan(100);
  });
});
