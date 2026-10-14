import 'reflect-metadata';
import type { ArgumentsHost } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { describe, expect, it, vi } from 'vitest';

import { BoardPublicController } from '../../controllers/board-public.controller';
import { BoardThrottleExceptionFilter } from '../board-throttle-exception.filter';

function run(existingRetryAfter?: string): {
  setHeader: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
} {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const setHeader = vi.fn();
  const response = { getHeader: vi.fn().mockReturnValue(existingRetryAfter), setHeader, status };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  new BoardThrottleExceptionFilter().catch(new ThrottlerException(), host);
  return { setHeader, status, json };
}

describe('BoardThrottleExceptionFilter', () => {
  it('answers a coded 429 body without the throttler class name', () => {
    const { status, json } = run();
    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({
      statusCode: 429,
      code: 'BOARD_RATE_LIMITED',
      message: 'Too many requests, try again in a moment',
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain('Throttler');
  });

  it('adds Retry-After when the guard did not set one, and keeps the guard value otherwise', () => {
    expect(run().setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(run('17').setHeader).not.toHaveBeenCalled();
  });

  it('is bound to the public Board controller', () => {
    const filters: unknown[] = Reflect.getMetadata('__exceptionFilters__', BoardPublicController);
    expect(filters).toContain(BoardThrottleExceptionFilter);
  });
});
