import { FallbackExecutorManager } from '../fallback-executor.manager';
import type {
  AttemptRecord,
  CandidateCallbackResult,
  FallbackCandidate,
} from '../../types/fallback-executor.types';

jest.mock('../../../../app/config/app.config');
const { AppConfig } = jest.requireMock('../../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

const candidates: FallbackCandidate[] = [
  { provider: 'OPENAI', model: 'gpt-4o' },
  { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
  { provider: 'GEMINI', model: 'gemini-2.5-flash' },
];

const safeAttempt = (attempts: AttemptRecord[], index: number): AttemptRecord => {
  const a = attempts[index];
  if (!a) {
    throw new Error(`attempt ${String(index)} missing`);
  }
  return a;
};

describe('FallbackExecutorManager', () => {
  let manager: FallbackExecutorManager;

  beforeEach(() => {
    manager = new FallbackExecutorManager();
    AppConfig.get.mockReturnValue({
      ROUTING_FALLBACK_ATTEMPTS_ENABLED: true,
      ROUTING_MAX_FALLBACK_ATTEMPTS: 3,
    });
  });

  describe('resolveMaxAttempts', () => {
    it('caps at 1 when the flag is off (primary only)', () => {
      AppConfig.get.mockReturnValue({
        ROUTING_FALLBACK_ATTEMPTS_ENABLED: false,
        ROUTING_MAX_FALLBACK_ATTEMPTS: 5,
      });
      expect(manager.resolveMaxAttempts(5)).toBe(1);
    });

    it('returns env limit when flag on and chain is longer', () => {
      AppConfig.get.mockReturnValue({
        ROUTING_FALLBACK_ATTEMPTS_ENABLED: true,
        ROUTING_MAX_FALLBACK_ATTEMPTS: 2,
      });
      expect(manager.resolveMaxAttempts(5)).toBe(2);
    });

    it('returns chain length when env limit is higher', () => {
      AppConfig.get.mockReturnValue({
        ROUTING_FALLBACK_ATTEMPTS_ENABLED: true,
        ROUTING_MAX_FALLBACK_ATTEMPTS: 10,
      });
      expect(manager.resolveMaxAttempts(2)).toBe(2);
    });

    it('caps at the hard ceiling even when env limit is higher', () => {
      AppConfig.get.mockReturnValue({
        ROUTING_FALLBACK_ATTEMPTS_ENABLED: true,
        ROUTING_MAX_FALLBACK_ATTEMPTS: 10,
      });
      expect(manager.resolveMaxAttempts(20)).toBe(5);
    });
  });

  describe('executeChain', () => {
    it('returns success on the first candidate when SUCCESS is returned', async () => {
      const callback = jest.fn<
        Promise<CandidateCallbackResult<string>>,
        [FallbackCandidate, number]
      >().mockResolvedValueOnce({ status: 'SUCCESS', response: 'ok', qualityScore: 0.9 });

      const outcome = await manager.executeChain(candidates, callback);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        expect(outcome.response).toBe('ok');
        expect(outcome.attempts).toHaveLength(1);
        const first = safeAttempt(outcome.attempts, 0);
        expect(first.status).toBe('SUCCESS');
        expect(first.qualityScore).toBe(0.9);
        expect(first.provider).toBe('OPENAI');
      }
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('moves to the next candidate on FAILURE and stops on the next SUCCESS', async () => {
      const callback = jest
        .fn<Promise<CandidateCallbackResult<string>>, [FallbackCandidate, number]>()
        .mockResolvedValueOnce({
          status: 'FAILURE',
          error: new Error('boom'),
          errorMessage: 'boom',
          errorCode: 'PROVIDER_ERROR',
        })
        .mockResolvedValueOnce({ status: 'SUCCESS', response: 'recovered', qualityScore: 0.7 });

      const outcome = await manager.executeChain(candidates, callback);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        expect(outcome.response).toBe('recovered');
        expect(outcome.attempts).toHaveLength(2);
        const first = safeAttempt(outcome.attempts, 0);
        const second = safeAttempt(outcome.attempts, 1);
        expect(first.status).toBe('FAILURE');
        expect(first.errorCode).toBe('PROVIDER_ERROR');
        expect(second.status).toBe('SUCCESS');
        expect(second.provider).toBe('ANTHROPIC');
      }
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('moves to the next candidate on RE_ROUTE and records the quality score', async () => {
      const callback = jest
        .fn<Promise<CandidateCallbackResult<string>>, [FallbackCandidate, number]>()
        .mockResolvedValueOnce({
          status: 'RE_ROUTE',
          qualityScore: 0.2,
          qualityReasons: ['too short'],
        })
        .mockResolvedValueOnce({ status: 'SUCCESS', response: 'good', qualityScore: 0.8 });

      const outcome = await manager.executeChain(candidates, callback);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        const first = safeAttempt(outcome.attempts, 0);
        expect(first.status).toBe('RE_ROUTE');
        expect(first.qualityScore).toBe(0.2);
        expect(first.qualityReasons).toEqual(['too short']);
      }
    });

    it('returns exhausted with the last error when every candidate fails', async () => {
      const callback = jest
        .fn<Promise<CandidateCallbackResult<string>>, [FallbackCandidate, number]>()
        .mockResolvedValue({
          status: 'FAILURE',
          error: new Error('still down'),
          errorMessage: 'still down',
        });

      const outcome = await manager.executeChain(candidates, callback);

      expect(outcome.kind).toBe('exhausted');
      if (outcome.kind === 'exhausted') {
        expect((outcome.lastError as Error).message).toBe('still down');
        expect(outcome.attempts).toHaveLength(3);
        expect(outcome.attempts.every((a) => a.status === 'FAILURE')).toBe(true);
      }
    });

    it('respects ROUTING_MAX_FALLBACK_ATTEMPTS cap', async () => {
      AppConfig.get.mockReturnValue({
        ROUTING_FALLBACK_ATTEMPTS_ENABLED: true,
        ROUTING_MAX_FALLBACK_ATTEMPTS: 2,
      });
      const callback = jest
        .fn<Promise<CandidateCallbackResult<string>>, [FallbackCandidate, number]>()
        .mockResolvedValue({ status: 'FAILURE', error: new Error('x'), errorMessage: 'x' });

      const outcome = await manager.executeChain(candidates, callback);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(outcome.attempts).toHaveLength(2);
      expect(outcome.kind).toBe('exhausted');
    });

    it('runs primary only when flag is off, even with a 3-candidate chain', async () => {
      AppConfig.get.mockReturnValue({
        ROUTING_FALLBACK_ATTEMPTS_ENABLED: false,
        ROUTING_MAX_FALLBACK_ATTEMPTS: 3,
      });
      const callback = jest
        .fn<Promise<CandidateCallbackResult<string>>, [FallbackCandidate, number]>()
        .mockResolvedValue({ status: 'FAILURE', error: new Error('x'), errorMessage: 'x' });

      const outcome = await manager.executeChain(candidates, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(outcome.attempts).toHaveLength(1);
    });

    it('captures attempts even when the callback throws (no crash)', async () => {
      const callback = jest
        .fn<Promise<CandidateCallbackResult<string>>, [FallbackCandidate, number]>()
        .mockImplementationOnce(() => {
          throw new Error('uncaught');
        })
        .mockResolvedValueOnce({ status: 'SUCCESS', response: 'after-crash' });

      const outcome = await manager.executeChain(candidates, callback);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        const first = safeAttempt(outcome.attempts, 0);
        const second = safeAttempt(outcome.attempts, 1);
        expect(first.status).toBe('FAILURE');
        expect(first.errorCode).toBe('UNCAUGHT_CALLBACK_ERROR');
        expect(second.status).toBe('SUCCESS');
      }
    });

    it('records durationMs as a non-negative number per attempt', async () => {
      const callback = jest
        .fn<Promise<CandidateCallbackResult<string>>, [FallbackCandidate, number]>()
        .mockImplementationOnce(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { status: 'SUCCESS', response: 'ok' };
        });

      const outcome = await manager.executeChain(candidates, callback);

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        const first = safeAttempt(outcome.attempts, 0);
        expect(first.durationMs).toBeGreaterThanOrEqual(0);
        expect(first.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });

    it('returns exhausted with zero attempts when candidate chain is empty', async () => {
      const callback = jest.fn();

      const outcome = await manager.executeChain([], callback);

      expect(outcome.kind).toBe('exhausted');
      expect(outcome.attempts).toHaveLength(0);
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
