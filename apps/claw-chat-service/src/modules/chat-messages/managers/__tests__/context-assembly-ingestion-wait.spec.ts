// Extraction is asynchronous, so a user who attaches a PDF and sends the message
// immediately can outrun it. This wait closes that race — and it is bounded,
// because an unbounded wait on another service inside the chat hot path is how a
// slow extractor becomes a hung conversation.

import { ContextAssemblyManager } from '../context-assembly.manager';
import { FILE_INGESTION_WAIT_TIMEOUT_MS } from '../../constants/file-content.constants';

jest.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: jest.fn().mockReturnValue('Service token'),
  httpRequest: jest.fn(),
  mapResearchModeToWorkflow: jest.fn(),
  runResearch: jest.fn(),
}));

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: jest.fn(() => ({ FILE_SERVICE_URL: 'https://file-service:4006' })) },
}));

const { httpRequest } = jest.requireMock('../../../../common/utilities') as {
  httpRequest: jest.Mock;
};

type Waiter = (fileIds: string[], userId: string) => Promise<void>;

const stateResponse = (ingestionStatus: string): unknown => ({
  ok: true,
  status: 200,
  data: { ingestionStatus },
});

describe('ContextAssemblyManager ingestion wait', () => {
  let wait: Waiter;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    const manager = new ContextAssemblyManager(
      { select: jest.fn() } as never,
      { retrieve: jest.fn() } as never,
    );
    wait = (fileIds, userId) =>
      (manager as unknown as { waitForIngestion: Waiter }).waitForIngestion(fileIds, userId);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Drives fake timers until the promise settles, so a polling loop advances
  // without the test sleeping in real time.
  async function settle(promise: Promise<void>): Promise<void> {
    let done = false;
    const tracked = promise.then(() => {
      done = true;
    });
    for (let tick = 0; tick < 200 && !done; tick++) {
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(500);
    }
    await tracked;
  }

  it('returns immediately when nothing is attached', async () => {
    await settle(wait([], 'user-1'));

    expect(httpRequest).not.toHaveBeenCalled();
  });

  it('stops polling as soon as extraction completes', async () => {
    httpRequest.mockResolvedValue(stateResponse('COMPLETED'));

    await settle(wait(['file-1'], 'user-1'));

    expect(httpRequest).toHaveBeenCalledTimes(1);
  });

  it('keeps polling while a file is still processing, then stops', async () => {
    httpRequest
      .mockResolvedValueOnce(stateResponse('PENDING'))
      .mockResolvedValueOnce(stateResponse('PROCESSING'))
      .mockResolvedValue(stateResponse('COMPLETED'));

    await settle(wait(['file-1'], 'user-1'));

    expect(httpRequest).toHaveBeenCalledTimes(3);
  });

  it('stops on FAILED rather than waiting out the deadline', async () => {
    httpRequest.mockResolvedValue(stateResponse('FAILED'));

    await settle(wait(['file-1'], 'user-1'));

    expect(httpRequest).toHaveBeenCalledTimes(1);
  });

  // The bound is the point. A file that never finishes must not hold the turn.
  it('gives up at the deadline instead of polling forever', async () => {
    httpRequest.mockResolvedValue(stateResponse('PROCESSING'));
    const startedAt = Date.now();

    await settle(wait(['file-1'], 'user-1'));

    expect(Date.now() - startedAt).toBeLessThanOrEqual(FILE_INGESTION_WAIT_TIMEOUT_MS + 1000);
  });

  it('resolves rather than throwing when the deadline expires', async () => {
    httpRequest.mockResolvedValue(stateResponse('PROCESSING'));

    await expect(settle(wait(['file-1'], 'user-1'))).resolves.toBeUndefined();
  });

  // Blocking the turn on a file-service that cannot answer would trade a
  // degraded reply for no reply at all.
  it('treats an unreachable file-service as settled', async () => {
    httpRequest.mockRejectedValue(new Error('ECONNREFUSED'));

    await settle(wait(['file-1'], 'user-1'));

    expect(httpRequest).toHaveBeenCalledTimes(1);
  });

  it('treats a non-ok response as settled', async () => {
    httpRequest.mockResolvedValue({ ok: false, status: 500, data: {} });

    await settle(wait(['file-1'], 'user-1'));

    expect(httpRequest).toHaveBeenCalledTimes(1);
  });

  it('waits on every attached file, not just the first', async () => {
    httpRequest.mockResolvedValue(stateResponse('COMPLETED'));

    await settle(wait(['file-1', 'file-2', 'file-3'], 'user-1'));

    expect(httpRequest).toHaveBeenCalledTimes(3);
  });

  it('stops polling a file that has settled while another is still running', async () => {
    httpRequest.mockImplementation(({ url }: { url: string }) =>
      Promise.resolve(
        url.includes('file-1') ? stateResponse('COMPLETED') : stateResponse('PROCESSING'),
      ),
    );

    await settle(wait(['file-1', 'file-2'], 'user-1'));

    const pollsForSettledFile = httpRequest.mock.calls.filter(
      ([args]: [{ url: string }]) => args.url.includes('file-1'),
    );
    expect(pollsForSettledFile).toHaveLength(1);
  });

  it('scopes the readiness check to the requesting user', async () => {
    httpRequest.mockResolvedValue(stateResponse('COMPLETED'));

    await settle(wait(['file-1'], 'user-42'));

    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('userId=user-42') }),
    );
  });
});
