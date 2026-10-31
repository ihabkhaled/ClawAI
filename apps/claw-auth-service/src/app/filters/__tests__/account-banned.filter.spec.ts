import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { describe, expect, it, vi } from 'vitest';
import { AccountBannedException } from '../../../common/errors';
import { GlobalExceptionFilter } from '../global-exception.filter';

function send(exception: unknown): { status: unknown; body: Record<string, unknown> } {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  new GlobalExceptionFilter().catch(exception, new ExecutionContextHost([{}, response, vi.fn()]));
  return { status: response.status.mock.calls[0]?.[0], body: response.json.mock.calls[0]?.[0] };
}

describe('GlobalExceptionFilter: ACCOUNT_BANNED', () => {
  it('sends 403 with the code, the end of a timed ban and banPermanent false', () => {
    const until = new Date('2026-11-05T10:00:00.000Z');
    const { status, body } = send(new AccountBannedException(until));
    expect(status).toBe(403);
    expect(body).toMatchObject({
      code: 'ACCOUNT_BANNED',
      errorCode: 'ACCOUNT_BANNED',
      bannedUntil: until.toISOString(),
      banPermanent: false,
    });
  });

  it('sends banPermanent true and a null end for a lifetime ban', () => {
    const { body } = send(new AccountBannedException(null));
    expect(body).toMatchObject({ code: 'ACCOUNT_BANNED', bannedUntil: null, banPermanent: true });
  });

  it('never puts the admin reason on the wire', () => {
    const { body } = send(new AccountBannedException(null));
    expect(JSON.stringify(body)).not.toMatch(/reason/i);
  });
});
