import { describe, expect, it } from 'vitest';

import { serviceNameFromContainer, toServerLogInput } from '../container-log.utility';

describe('serviceNameFromContainer', () => {
  it.each([
    ['claw-chat-service-412', 'chat-service'],
    ['/claw-routing-service', 'routing-service'],
    ['claw-nginx', 'nginx'],
    ['claw-pg-chat', 'pg-chat'],
    ['some-other', 'some-other'],
  ])('%s -> %s', (container, expected) => {
    expect(serviceNameFromContainer(container)).toBe(expected);
  });
});

describe('toServerLogInput', () => {
  // A real production line (2026-09-19), colour codes and all.
  it('reads a Nest Logger line with its real level and context', () => {
    const row = toServerLogInput({
      container: 'claw-chat-service-414',
      stream: 'stdout',
      message:
        '\u001b[33m[Nest] 1  - \u001b[39m09/19/2026, 9:02:41 AM \u001b[33m   WARN\u001b[39m \u001b[38;5;3m[ChatExecutionManager] \u001b[39m\u001b[33mrunExecutor: finish_reason=length\u001b[39m',
    });

    expect(row).toMatchObject({
      serviceName: 'chat-service',
      level: 'WARN',
      module: 'ChatExecutionManager',
      message: 'runExecutor: finish_reason=length',
      action: 'container_log',
    });
  });

  it('reads a pino request line and keeps its request and trace ids', () => {
    const row = toServerLogInput({
      container: 'claw-chat-service-412',
      message: JSON.stringify({
        level: 50,
        msg: 'request errored',
        requestId: 'req-1',
        traceId: 'trace-1',
        req: { method: 'POST', url: '/api/v1/chat-messages' },
        res: { statusCode: 500 },
        responseTime: 27,
      }),
    });

    expect(row).toMatchObject({
      level: 'ERROR',
      message: 'request errored',
      requestId: 'req-1',
      traceId: 'trace-1',
      method: 'POST',
      route: '/api/v1/chat-messages',
      statusCode: 500,
      latencyMs: 27,
    });
  });

  it('grades plain nginx and Postgres lines by their words and stream', () => {
    expect(
      toServerLogInput({
        container: 'claw-nginx',
        message: '2026/09/19 [error] 29#29: *1 upstream timed out',
      })?.level,
    ).toBe('ERROR');
    expect(
      toServerLogInput({ container: 'claw-pg-chat', message: 'WARNING:  there is no transaction' })
        ?.level,
    ).toBe('WARN');
    expect(
      toServerLogInput({ container: 'claw-redis', stream: 'stderr', message: 'something odd' })
        ?.level,
    ).toBe('WARN');
    expect(
      toServerLogInput({ container: 'claw-redis', message: 'Ready to accept connections' })?.level,
    ).toBe('INFO');
  });

  it('reads a pino-pretty dev line by its level, not by words in the text', () => {
    const row = toServerLogInput({
      container: 'claw-server-logs-service',
      message: '[10:03:01.596] DEBUG (148): createLog: level=WARN serviceName=workspace-service',
    });
    expect(row).toMatchObject({
      level: 'DEBUG',
      message: 'createLog: level=WARN serviceName=workspace-service',
    });
  });

  it('drops blank lines', () => {
    expect(toServerLogInput({ container: 'claw-nginx', message: '   ' })).toBeNull();
  });

  it('cuts an oversized line to fit the store', () => {
    const row = toServerLogInput({ container: 'claw-nginx', message: 'x'.repeat(20_000) });
    expect(row?.message.length).toBeLessThanOrEqual(5_000);
  });

  it('treats malformed JSON as plain text rather than failing', () => {
    expect(toServerLogInput({ container: 'claw-x', message: '{not json' })?.message).toBe(
      '{not json',
    );
  });
});
