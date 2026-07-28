import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { type ModuleRef } from '@nestjs/core';
import { of } from 'rxjs';
import { EventPattern, LogLevel } from '@claw/shared-types';
import { RABBITMQ_MODULE_OPTIONS, RabbitMQService } from '@claw/shared-rabbitmq';

import { LoggingInterceptor } from '../logging.interceptor';

type MockRequest = { method: string; url: string; headers: Record<string, string | undefined> };
type MockResponse = { statusCode: number; setHeader: jest.Mock };

function buildContext(request: MockRequest, response: MockResponse): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;
}

function buildHandler(): CallHandler {
  return { handle: () => of({ ok: true }) };
}

// Typed with its real two-argument signature so assertions can reach into
// mock.calls[n][1] (the payload) without a cast.
function buildPublishMock(): jest.Mock<Promise<void>, [string, Record<string, unknown>]> {
  return jest.fn(async (_pattern: string, _payload: Record<string, unknown>) => {});
}

function buildModuleRef(publish: jest.Mock | null): ModuleRef {
  return {
    get: jest.fn((token: unknown) => {
      if (publish === null) {
        throw new Error('not available');
      }
      if (token === RabbitMQService) {
        return { publish };
      }
      if (token === RABBITMQ_MODULE_OPTIONS) {
        return { serviceName: 'payment-service' };
      }
      return;
    }),
  } as unknown as ModuleRef;
}

async function drain(observable: ReturnType<CallHandler['handle']>): Promise<void> {
  await new Promise<void>((resolve) => {
    observable.subscribe({ complete: () => resolve() });
  });
}

describe('LoggingInterceptor', () => {
  let response: MockResponse;

  beforeEach(() => {
    response = { statusCode: 200, setHeader: jest.fn() };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('generates and echoes correlation ids when the client sends none', async () => {
    const request: MockRequest = {
      method: 'POST',
      url: '/api/v1/billing/checkout-sessions',
      headers: {},
    };
    const interceptor = new LoggingInterceptor(buildModuleRef(jest.fn(async () => {})));
    jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => {});

    await drain(interceptor.intercept(buildContext(request, response), buildHandler()));

    expect(request.headers['x-request-id']).toBeDefined();
    expect(request.headers['x-trace-id']).toBeDefined();
    expect(response.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      request.headers['x-request-id'],
    );
    expect(response.setHeader).toHaveBeenCalledWith('x-trace-id', request.headers['x-trace-id']);
  });

  it('preserves a client-supplied request id so a trace spans services', async () => {
    const request: MockRequest = {
      method: 'GET',
      url: '/api/v1/billing/me',
      headers: { 'x-request-id': 'req-abc', 'x-trace-id': 'trace-abc' },
    };
    const interceptor = new LoggingInterceptor(buildModuleRef(jest.fn(async () => {})));
    jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => {});

    await drain(interceptor.intercept(buildContext(request, response), buildHandler()));

    expect(request.headers['x-request-id']).toBe('req-abc');
  });

  it('publishes an INFO server log for a successful request', async () => {
    const publish = buildPublishMock();
    const request: MockRequest = { method: 'GET', url: '/api/v1/billing/plans', headers: {} };
    const interceptor = new LoggingInterceptor(buildModuleRef(publish));
    jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => {});

    await drain(interceptor.intercept(buildContext(request, response), buildHandler()));

    expect(publish).toHaveBeenCalledWith(
      EventPattern.LOG_SERVER,
      expect.objectContaining({ level: LogLevel.INFO, serviceName: 'payment-service' }),
    );
  });

  it('publishes an ERROR server log for a 4xx or 5xx', async () => {
    const publish = buildPublishMock();
    response.statusCode = 422;
    const request: MockRequest = {
      method: 'POST',
      url: '/api/v1/payments/webhooks/paypal',
      headers: {},
    };
    const interceptor = new LoggingInterceptor(buildModuleRef(publish));
    jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => {});

    await drain(interceptor.intercept(buildContext(request, response), buildHandler()));

    expect(publish).toHaveBeenCalledWith(
      EventPattern.LOG_SERVER,
      expect.objectContaining({ level: LogLevel.ERROR, statusCode: 422 }),
    );
  });

  it('logs the route but never the request body', async () => {
    const publish = buildPublishMock();
    const request: MockRequest = {
      method: 'POST',
      url: '/api/v1/payments/paymob/intention',
      headers: {},
    };
    const interceptor = new LoggingInterceptor(buildModuleRef(publish));
    jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => {});

    await drain(interceptor.intercept(buildContext(request, response), buildHandler()));

    const payload = publish.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('body');
    expect(payload['route']).toBe('/api/v1/payments/paymob/intention');
  });

  it('strips sensitive query parameters from local and published logs', async () => {
    const publish = buildPublishMock();
    const request: MockRequest = {
      method: 'POST',
      url: '/api/v1/payments/webhooks/paymob?hmac=super-secret&session=session-secret',
      headers: {},
    };
    const interceptor = new LoggingInterceptor(buildModuleRef(publish));
    const localLog = jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => {});

    await drain(interceptor.intercept(buildContext(request, response), buildHandler()));

    const payload = publish.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(localLog).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/api/v1/payments/webhooks/paymob' }),
      expect.not.stringContaining('super-secret'),
    );
    expect(payload['route']).toBe('/api/v1/payments/webhooks/paymob');
    expect(JSON.stringify(payload)).not.toContain('super-secret');
    expect(JSON.stringify(payload)).not.toContain('session-secret');
  });

  it('still serves the request when RabbitMQ is unavailable', async () => {
    const request: MockRequest = { method: 'GET', url: '/api/v1/health', headers: {} };
    const interceptor = new LoggingInterceptor(buildModuleRef(null));
    jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => {});

    await expect(
      drain(interceptor.intercept(buildContext(request, response), buildHandler())),
    ).resolves.toBeUndefined();
  });

  it('resolves RabbitMQ once and reuses it across requests', async () => {
    // The ModuleRef lookup happens on the first request only; repeating it per
    // request would add a container resolution to every payment call.
    const publish = buildPublishMock();
    const moduleRef = buildModuleRef(publish);
    const interceptor = new LoggingInterceptor(moduleRef);
    jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => {});
    const request: MockRequest = { method: 'GET', url: '/api/v1/billing/plans', headers: {} };

    await drain(interceptor.intercept(buildContext(request, response), buildHandler()));
    const lookupsAfterFirst = (moduleRef.get as jest.Mock).mock.calls.length;
    await drain(interceptor.intercept(buildContext(request, response), buildHandler()));

    expect((moduleRef.get as jest.Mock).mock.calls.length).toBe(lookupsAfterFirst);
    expect(publish).toHaveBeenCalledTimes(2);
  });

  it('never breaks a request when publishing fails', async () => {
    // A logging outage must not fail a payment.
    const publish = jest.fn(() => Promise.reject(new Error('broker down')));
    const request: MockRequest = { method: 'GET', url: '/api/v1/billing/me', headers: {} };
    const interceptor = new LoggingInterceptor(buildModuleRef(publish));
    jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => {});

    await expect(
      drain(interceptor.intercept(buildContext(request, response), buildHandler())),
    ).resolves.toBeUndefined();
  });
});
