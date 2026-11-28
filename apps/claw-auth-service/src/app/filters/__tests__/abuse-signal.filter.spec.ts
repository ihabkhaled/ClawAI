import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ThrottlerException } from '@nestjs/throttler';
import { describe, expect, it, vi } from 'vitest';

import {
  AccountBannedException,
  BusinessException,
  InvalidCredentialsException,
} from '../../../common/errors';
import { AbuseSignalCode } from '../../../modules/abuse-defense/enums/abuse-signal-code.enum';
import { GlobalExceptionFilter } from '../global-exception.filter';

// ADR-233: only a refusal of an AUTHENTICATED request says something about the account that sent it.
// A request with no valid token has no `user`, so what an attacker does TO an account (failed
// sign-ins, token guessing, floods against its address) can never be charged to the account.

function run(
  exception: unknown,
  request: Record<string, unknown>,
): { record: ReturnType<typeof vi.fn>; status: number; body: Record<string, unknown> } {
  const response = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };
  response.status.mockReturnValue(response);
  const record = vi.fn().mockResolvedValue(undefined);
  new GlobalExceptionFilter({ record }).catch(
    exception,
    new ExecutionContextHost([request, response, vi.fn()]),
  );
  return {
    record,
    status: response.status.mock.calls[0]?.[0] as number,
    body: response.json.mock.calls[0]?.[0] as Record<string, unknown>,
  };
}

const SIGNED_IN = { user: { id: 'user-1', email: 'a@b.co', role: 'USER', sessionId: 's-1' } };

describe('GlobalExceptionFilter abuse signals', () => {
  describe('an authenticated account reports on ITSELF', () => {
    it('its own 429 is a RATE_LIMIT_TRIPPED signal', () => {
      const { record, status } = run(new ThrottlerException(), SIGNED_IN);
      expect(status).toBe(429);
      expect(record).toHaveBeenCalledWith({
        userId: 'user-1',
        code: AbuseSignalCode.RATE_LIMIT_TRIPPED,
        source: 'auth.http',
      });
    });

    it('a role or permission refusal is a FORBIDDEN_PROBE signal', () => {
      const { record, status } = run(new ForbiddenException('Forbidden resource'), SIGNED_IN);
      expect(status).toBe(403);
      expect(record).toHaveBeenCalledWith({
        userId: 'user-1',
        code: AbuseSignalCode.FORBIDDEN_PROBE,
        source: 'auth.http',
      });
    });
  });

  describe('a victim is never punished for what is done to their account', () => {
    it('failed sign-ins against someone (401 INVALID_CREDENTIALS, no token) signal nothing', () => {
      const { record, status } = run(new InvalidCredentialsException(), {});
      expect(status).toBe(401);
      expect(record).not.toHaveBeenCalled();
    });

    it('a flood of 429s on a PUBLIC route (no token, so no user) signals nothing', () => {
      const { record } = run(new ThrottlerException(), {});
      expect(record).not.toHaveBeenCalled();
    });

    it('an attacker presenting a bad token has no user, so nothing is charged to the token owner', () => {
      const { record } = run(new UnauthorizedException('Invalid or expired token'), {});
      expect(record).not.toHaveBeenCalled();
    });

    it('a 401 on an authenticated request is not abuse either', () => {
      const { record } = run(new UnauthorizedException(), SIGNED_IN);
      expect(record).not.toHaveBeenCalled();
    });

    it('a 429 BusinessException on a public sign-up route is not charged to any account', () => {
      const { record } = run(
        new BusinessException(
          'limited',
          'SIGNUP_TEMPORARILY_LIMITED',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
        {},
      );
      expect(record).not.toHaveBeenCalled();
    });
  });

  describe('domain refusals are not probes', () => {
    it.each([
      ['a 403 business rule', new BusinessException('no', 'CANNOT_BAN_SELF', HttpStatus.FORBIDDEN)],
      ['a banned account', new AccountBannedException(null)],
      ['a 404', new NotFoundException()],
      ['a 400', new HttpException('bad', HttpStatus.BAD_REQUEST)],
      ['a 500', new Error('boom')],
    ])('%s signals nothing even for a signed-in account', (_name, exception) => {
      const { record } = run(exception, SIGNED_IN);
      expect(record).not.toHaveBeenCalled();
    });
  });

  it('an exception raised with no request object (a non-HTTP context) is answered, not rethrown', () => {
    const response = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };
    response.status.mockReturnValue(response);
    const record = vi.fn();
    expect(() =>
      new GlobalExceptionFilter({ record }).catch(
        new ThrottlerException(),
        new ExecutionContextHost([undefined, response, vi.fn()]),
      ),
    ).not.toThrow();
    expect(record).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(429);
  });

  it('answers the client exactly as before: reporting never changes the response', () => {
    const { body, status } = run(new ForbiddenException('Forbidden resource'), SIGNED_IN);
    expect(status).toBe(403);
    expect(body).toMatchObject({ statusCode: 403, message: 'Forbidden resource' });
    expect(JSON.stringify(body)).not.toMatch(/abuse|signal|suspend/i);
  });
});
