import { BadGatewayException, HttpException } from '@nestjs/common';
import { httpRequest } from '@claw/shared-utilities';

import { EnhanceModelClient } from '../enhance-model.client';
import { ModelRateClient } from '../model-rate.client';

vi.mock('@claw/shared-utilities', () => ({
  httpRequest: vi.fn(),
  declaredHost: vi.fn(() => new Set(['host'])),
}));

const http = vi.mocked(httpRequest);

const env = {
  AUTH_SERVICE_URL: 'http://auth:4001',
  CHAT_SERVICE_URL: 'http://chat:4002',
  CONNECTOR_SERVICE_URL: 'http://connector:4003',
  FILE_SERVICE_URL: 'http://file:4004',
  FILE_GENERATION_SERVICE_URL: 'http://filegen:4005',
  INTER_SERVICE_AUTH_TOKEN: 'x'.repeat(40),
  JWT_SECRET: 'y'.repeat(40),
  LIVE_DATABASE_URL: 'postgres://x',
  REDIS_URL: 'redis://x',
};

describe('enhance clients', () => {
  beforeEach(() => {
    http.mockReset();
    Object.assign(process.env, env);
    process.env['ROUTING_SERVICE_URL'] = 'http://routing:4010';
  });

  afterEach(() => {
    delete process.env['ROUTING_SERVICE_URL'];
  });

  it('calls chat-service generate with the LIVE_INTELLIGENCE surface and Service auth', async () => {
    http.mockResolvedValue({ ok: true, status: 200, data: { content: 'Hi', costMicroUsd: 5 } });
    const result = await new EnhanceModelClient().generate({
      userId: 'u1',
      requestId: 'r',
      provider: 'openai',
      model: 'm',
      systemPrompt: 's',
      userPrompt: 'p',
    });
    expect(result).toEqual({ content: 'Hi', costMicroUsd: 5 });
    const call = http.mock.calls[0]![0];
    expect(call.url).toBe('http://chat:4002/api/v1/internal/chat/generate');
    expect(call.headers?.['Authorization']).toBe(`Service ${'x'.repeat(40)}`);
    expect(call.body).toMatchObject({ surface: 'LIVE_INTELLIGENCE', userId: 'u1', requestId: 'r' });
  });

  it('passes wallet refusals through and maps other failures to 502', async () => {
    const request = {
      userId: 'u',
      requestId: 'r',
      provider: 'p',
      model: 'm',
      systemPrompt: 's',
      userPrompt: 'p',
    };
    http.mockResolvedValue({ ok: false, status: 402, data: {} });
    await expect(new EnhanceModelClient().generate(request)).rejects.toMatchObject({ status: 402 });
    await expect(new EnhanceModelClient().generate(request)).rejects.toBeInstanceOf(HttpException);
    http.mockResolvedValue({ ok: false, status: 500, data: {} });
    await expect(new EnhanceModelClient().generate(request)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    http.mockResolvedValue({ ok: true, status: 200, data: { nope: 1 } });
    await expect(new EnhanceModelClient().generate(request)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('reads a rate card and fails closed on every failure mode', async () => {
    const client = new ModelRateClient();
    const ref = { provider: 'openai', model: 'gpt/x' };
    http.mockResolvedValue({
      ok: true,
      status: 200,
      data: { isPriced: true, inputPerMillionMicroUsd: 10, outputPerMillionMicroUsd: 20 },
    });
    await expect(client.findRates(ref)).resolves.toMatchObject({ inputPerMillionMicroUsd: 10 });
    expect(http.mock.calls[0]![0].url).toBe(
      'http://routing:4010/api/v1/internal/router-models/costs/openai/gpt%2Fx',
    );
    http.mockResolvedValue({
      ok: true,
      status: 200,
      data: { isPriced: false, inputPerMillionMicroUsd: null, outputPerMillionMicroUsd: null },
    });
    await expect(client.findRates(ref)).resolves.toBeNull();
    http.mockResolvedValue({ ok: false, status: 404, data: {} });
    await expect(client.findRates(ref)).resolves.toBeNull();
    http.mockRejectedValue(new Error('down'));
    await expect(client.findRates(ref)).resolves.toBeNull();
  });
});
