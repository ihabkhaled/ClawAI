import { LiveCapability, LiveSessionState } from '../../../../generated/prisma';
import type { SourceResolution } from '../../../sources/types/source-resolution.types';
import { summaryMediaAccrual, summaryResolution } from '../live-summary.utility';

describe('summaryResolution', () => {
  const recorded = {
    capability: LiveCapability.RECORDED,
    accessScope: 'PRIVATE:u1',
  } as SourceResolution;

  it('moves a recorded video to its own SUMMARY scope, apart from the play-along run', () => {
    expect(summaryResolution(recorded, 'u1').accessScope).toBe('SUMMARY:u1');
  });

  it.each([LiveCapability.SERVER_PULL, LiveCapability.BROWSER_CAPTURE, LiveCapability.LINK_ONLY])(
    'refuses %s with LIVE_SUMMARY_NEEDS_RECORDED',
    (capability) => {
      expect(() => summaryResolution({ ...recorded, capability }, 'u1')).toThrow(
        'LIVE_SUMMARY_NEEDS_RECORDED',
      );
    },
  );
});

describe('summaryMediaAccrual', () => {
  const session = { summary: true, accruedMediaSeconds: 120 };
  const run = { processedMediaSeconds: 180 };

  it('accrues the media seconds processed since the last accrual', () => {
    expect(summaryMediaAccrual(session, run, LiveSessionState.ACTIVE)).toEqual({
      from: 120,
      to: 180,
    });
    expect(summaryMediaAccrual(session, run, LiveSessionState.GRACE)).toEqual({
      from: 120,
      to: 180,
    });
  });

  it('accrues nothing for play-along sessions, without progress, or while waiting for credits', () => {
    expect(
      summaryMediaAccrual({ ...session, summary: false }, run, LiveSessionState.ACTIVE),
    ).toBeNull();
    expect(
      summaryMediaAccrual(session, { processedMediaSeconds: 120 }, LiveSessionState.ACTIVE),
    ).toBeNull();
    expect(
      summaryMediaAccrual(session, { processedMediaSeconds: 60 }, LiveSessionState.ACTIVE),
    ).toBeNull();
    expect(summaryMediaAccrual(session, run, LiveSessionState.CREDITS_REQUIRED)).toBeNull();
    expect(summaryMediaAccrual(session, null, LiveSessionState.ACTIVE)).toBeNull();
  });
});
