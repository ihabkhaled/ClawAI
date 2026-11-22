import { HttpStatus } from '@nestjs/common';

import { LiveCapability, LiveSessionState } from '../../../../generated/prisma';
import { pcmToWav } from '../../../processing/utilities/wav.utility';
import { LiveCaptureService } from '../live-capture.service';

const target = {
  sessionId: 'sess1',
  state: LiveSessionState.ACTIVE,
  capability: LiveCapability.BROWSER_CAPTURE,
  runId: 'run1',
  captureSessionId: 'sess1',
};
const wav = pcmToWav(Buffer.alloc(6 * 32_000), 16_000, 1);

function setup() {
  const targets = { findTarget: vi.fn().mockResolvedValue(target) };
  const capture = {
    claimRateSlot: vi.fn().mockResolvedValue(true),
    enqueue: vi.fn().mockResolvedValue(undefined),
  };
  return { service: new LiveCaptureService(targets as never, capture as never), targets, capture };
}

describe('LiveCaptureService', () => {
  it('queues a valid chunk with media time start..start+duration and answers accepted', async () => {
    const { service, capture, targets } = setup();
    const startAt = Date.now() - 6000;
    await expect(service.ingest('sess1', 'u1', wav, String(startAt))).resolves.toEqual({
      accepted: true,
    });
    expect(targets.findTarget).toHaveBeenCalledWith('sess1', 'u1');
    expect(capture.enqueue).toHaveBeenCalledWith('run1', { wav, startAt, endAt: startAt + 6000 });
  });

  it('404 for a session the caller does not own', async () => {
    const { service, targets, capture } = setup();
    targets.findTarget.mockResolvedValue(null);
    await expect(service.ingest('sess1', 'other', wav, String(Date.now()))).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
    expect(capture.enqueue).not.toHaveBeenCalled();
  });

  it.each([
    LiveSessionState.DETACHED,
    LiveSessionState.EXHAUSTED,
    LiveSessionState.CREDITS_REQUIRED,
  ])('409 when the session is %s', async (state) => {
    const { service, targets } = setup();
    targets.findTarget.mockResolvedValue({ ...target, state });
    await expect(service.ingest('sess1', 'u1', wav, String(Date.now()))).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      response: expect.objectContaining({ errorCode: 'LIVE_CAPTURE_SESSION_INACTIVE' }),
    });
  });

  it('422 when the source is not BROWSER_CAPTURE', async () => {
    const { service, targets } = setup();
    targets.findTarget.mockResolvedValue({ ...target, capability: LiveCapability.AUDIO_VISION });
    await expect(service.ingest('sess1', 'u1', wav, String(Date.now()))).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: expect.objectContaining({ errorCode: 'LIVE_CAPTURE_NOT_SUPPORTED' }),
    });
  });

  it('409 when another session owns the run audio, or there is no run', async () => {
    const { service, targets, capture } = setup();
    targets.findTarget.mockResolvedValueOnce({ ...target, captureSessionId: 'sess-other' });
    await expect(service.ingest('sess1', 'u1', wav, String(Date.now()))).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      response: expect.objectContaining({ errorCode: 'LIVE_CAPTURE_SESSION_MISMATCH' }),
    });
    targets.findTarget.mockResolvedValueOnce({ ...target, runId: null, captureSessionId: null });
    await expect(service.ingest('sess1', 'u1', wav, String(Date.now()))).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
    });
    expect(capture.claimRateSlot).not.toHaveBeenCalled();
  });

  it('429 when a chunk arrives within 3 s of the previous one', async () => {
    const { service, capture } = setup();
    capture.claimRateSlot.mockResolvedValue(false);
    await expect(service.ingest('sess1', 'u1', wav, String(Date.now()))).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      response: expect.objectContaining({ errorCode: 'LIVE_CAPTURE_RATE_LIMITED' }),
    });
    expect(capture.claimRateSlot).toHaveBeenCalledWith('sess1');
    expect(capture.enqueue).not.toHaveBeenCalled();
  });

  it('413 for a body over 400 KB', async () => {
    const { service } = setup();
    await expect(
      service.ingest('sess1', 'u1', Buffer.alloc(400 * 1024 + 1), String(Date.now())),
    ).rejects.toMatchObject({ status: HttpStatus.PAYLOAD_TOO_LARGE });
  });

  it.each([
    ['a JSON body (wrong content type)', {}],
    ['an empty body', Buffer.alloc(0)],
    ['a non-WAV body', Buffer.from('not a wav file at all, just text')],
    ['a stereo WAV', pcmToWav(Buffer.alloc(2 * 64_000), 16_000, 2)],
  ])('422 for %s', async (_label, body) => {
    const { service, capture } = setup();
    await expect(service.ingest('sess1', 'u1', body, String(Date.now()))).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: expect.objectContaining({ errorCode: 'LIVE_CAPTURE_AUDIO_INVALID' }),
    });
    expect(capture.enqueue).not.toHaveBeenCalled();
  });

  it.each([undefined, 'soon', String(Date.now() - 5 * 60_000)])(
    '422 for a bad X-Chunk-Start-At (%s)',
    async (header) => {
      const { service } = setup();
      await expect(service.ingest('sess1', 'u1', wav, header)).rejects.toMatchObject({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        response: expect.objectContaining({ errorCode: 'LIVE_CAPTURE_CHUNK_TIME_INVALID' }),
      });
    },
  );
});
