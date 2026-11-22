import { LiveStreamController } from '../live-stream.controller';

describe('LiveStreamController', () => {
  it('opens the stream for the authenticated user with Last-Event-ID', async () => {
    const sse = { open: vi.fn().mockResolvedValue({}) };
    const controller = new LiveStreamController(sse as never);
    const request = {} as never;
    const response = {} as never;
    await controller.stream('s1', { id: 'u1' } as never, 'run1:3', request, response);
    expect(sse.open).toHaveBeenCalledWith('s1', 'u1', 'run1:3', request, response);
  });
});
