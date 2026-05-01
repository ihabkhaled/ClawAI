import { LlamacppHealthManager } from '../managers/llamacpp-health.manager';
import { httpRequest } from '../../../common/utilities/http-client.utility';

jest.mock('../../../common/utilities/http-client.utility', () => ({
  httpRequest: jest.fn(),
}));

const mockedHttpRequest = httpRequest as unknown as jest.Mock;

describe('LlamacppHealthManager', () => {
  beforeEach(() => {
    mockedHttpRequest.mockReset();
  });

  function build(): LlamacppHealthManager {
    return new LlamacppHealthManager();
  }

  it('isFrontierAvailable() is false before first probe', () => {
    const mgr = build();
    expect(mgr.isFrontierAvailable()).toBe(false);
  });

  it('marks reachable + loadedModel after a successful probe with activeModel', async () => {
    mockedHttpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        binary: { installed: true },
        activeModel: { id: 'm1', name: 'glm', tag: 'Q4', loadStatus: 'READY', port: 48500 },
      },
    });
    const mgr = build();
    await mgr.probe();
    const state = mgr.getState();
    expect(state.reachable).toBe(true);
    expect(state.binaryReady).toBe(true);
    expect(state.loadedModel?.id).toBe('m1');
    expect(mgr.isFrontierAvailable()).toBe(true);
  });

  it('isFrontierAvailable() stays false when reachable but no activeModel', async () => {
    mockedHttpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { binary: { installed: true }, activeModel: null },
    });
    const mgr = build();
    await mgr.probe();
    expect(mgr.isFrontierAvailable()).toBe(false);
  });

  it('marks unreachable on HTTP non-200', async () => {
    mockedHttpRequest.mockResolvedValueOnce({ ok: false, status: 503, data: {} });
    const mgr = build();
    await mgr.probe();
    const state = mgr.getState();
    expect(state.reachable).toBe(false);
    expect(state.binaryReady).toBe(false);
    expect(state.loadedModel).toBeNull();
  });

  it('marks unreachable on thrown error (no crash)', async () => {
    mockedHttpRequest.mockRejectedValueOnce(new Error('econnrefused'));
    const mgr = build();
    await mgr.probe();
    expect(mgr.getState().reachable).toBe(false);
  });
});
