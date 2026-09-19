import {
  ANSI_ESCAPES,
  CONTAINER_LOG_ACTION,
  CONTAINER_LOG_MESSAGE_MAX_CHARS,
  CONTAINER_NAME_PREFIX,
  CONTAINER_REPLICA_SUFFIX,
  NEST_LEVELS,
  NEST_PRETTY_LINE,
  PINO_LEVELS,
  PINO_PRETTY_LEVELS,
  PINO_PRETTY_LINE,
  PLAIN_ERROR_WORDS,
  PLAIN_WARN_WORDS,
} from '../constants/container-log.constants';
import type { ContainerLogLine } from '../dtos/ingest-container-logs.dto';
import type { ContainerLogBase, CreateServerLogInput } from '../types/server-logs.types';

/** `claw-chat-service-412` -> `chat-service`; `/claw-nginx` -> `nginx`. */
export function serviceNameFromContainer(container: string): string {
  const bare = container.replace(/^\//u, '').replace(CONTAINER_REPLICA_SUFFIX, '');
  return bare.startsWith(CONTAINER_NAME_PREFIX) ? bare.slice(CONTAINER_NAME_PREFIX.length) : bare;
}

/**
 * One container line to one log row, or null for a blank line.
 *
 * Three shapes arrive: pino JSON (request lines), Nest's pretty format (every
 * `Logger` call) and plain text (nginx, Postgres, Redis, RabbitMQ). Each keeps
 * its real level, and pino lines keep their request and trace ids, so a line
 * from stdout can be joined to the request line of the same call.
 */
export function toServerLogInput(line: ContainerLogLine): CreateServerLogInput | null {
  const text = line.message.replace(ANSI_ESCAPES, '').trim();
  if (text.length === 0) {
    return null;
  }
  const base = {
    serviceName: serviceNameFromContainer(line.container),
    action: CONTAINER_LOG_ACTION,
    metadata: {
      container: line.container,
      stream: line.stream ?? 'stdout',
      ...(line.timestamp === undefined ? {} : { shippedAt: line.timestamp }),
    },
  };
  return (
    fromPino(text, base) ??
    fromNest(text, base) ??
    fromPinoPretty(text, base) ??
    fromPlain(text, line.stream, base)
  );
}

function fromPino(text: string, base: ContainerLogBase): CreateServerLogInput | null {
  if (!text.startsWith('{')) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  const level =
    typeof record['level'] === 'number' ? (PINO_LEVELS[record['level']] ?? 'INFO') : 'INFO';
  const req = (record['req'] ?? {}) as Record<string, unknown>;
  const res = (record['res'] ?? {}) as Record<string, unknown>;
  return {
    ...base,
    level,
    message: clip(String(record['msg'] ?? text)),
    ...str('requestId', record['requestId']),
    ...str('traceId', record['traceId']),
    ...str('method', req['method']),
    ...str('route', req['url']),
    ...(typeof res['statusCode'] === 'number' ? { statusCode: res['statusCode'] } : {}),
    ...(typeof record['responseTime'] === 'number' ? { latencyMs: record['responseTime'] } : {}),
  };
}

function fromNest(text: string, base: ContainerLogBase): CreateServerLogInput | null {
  const match = NEST_PRETTY_LINE.exec(text);
  if (match === null) {
    return null;
  }
  const [, word = 'LOG', context = '', message = ''] = match;
  return {
    ...base,
    level: NEST_LEVELS[word] ?? 'INFO',
    module: context.slice(0, 200),
    message: clip(message),
  };
}

function fromPinoPretty(text: string, base: ContainerLogBase): CreateServerLogInput | null {
  const match = PINO_PRETTY_LINE.exec(text);
  if (match === null) {
    return null;
  }
  const [, word = 'INFO', message = ''] = match;
  return { ...base, level: PINO_PRETTY_LEVELS[word] ?? 'INFO', message: clip(message) };
}

function fromPlain(
  text: string,
  stream: string | undefined,
  base: ContainerLogBase,
): CreateServerLogInput {
  return { ...base, level: plainLevel(text, stream), message: clip(text) };
}

function plainLevel(text: string, stream: string | undefined): string {
  if (PLAIN_ERROR_WORDS.test(text)) {
    return 'ERROR';
  }
  if (PLAIN_WARN_WORDS.test(text) || stream === 'stderr') {
    return 'WARN';
  }
  return 'INFO';
}

function clip(text: string): string {
  return text.length > CONTAINER_LOG_MESSAGE_MAX_CHARS
    ? `${text.slice(0, CONTAINER_LOG_MESSAGE_MAX_CHARS)}…`
    : text;
}

function str(key: string, value: unknown): Record<string, string> {
  return typeof value === 'string' && value.length > 0 ? { [key]: value.slice(0, 200) } : {};
}
