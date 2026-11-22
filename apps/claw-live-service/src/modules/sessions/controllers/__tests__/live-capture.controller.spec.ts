import { LiveCaptureController } from '../live-capture.controller';

describe('LiveCaptureController', () => {
  it('passes session, user, raw body and X-Chunk-Start-At straight to the service', async () => {
    const service = { ingest: vi.fn().mockResolvedValue({ accepted: true }) };
    const controller = new LiveCaptureController(service as never);
    const body = Buffer.from('RIFF');
    await expect(
      controller.audio({ id: 'u1' } as never, 'sess1', '1800000000000', body),
    ).resolves.toEqual({ accepted: true });
    expect(service.ingest).toHaveBeenCalledWith('sess1', 'u1', body, '1800000000000');
  });
});
