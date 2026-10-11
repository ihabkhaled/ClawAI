import { vi } from 'vitest';
import { ConnectorCredentialService } from '../services/connector-credential.service';

const AUTH_HEADER = 'Service inter-service-token-for-credential-spec';
const SECRET_KEY = 'sk-secret-credential-value';

const { httpRequestMock } = vi.hoisted(() => ({ httpRequestMock: vi.fn() }));

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: (): Record<string, string> => ({
      CONNECTOR_SERVICE_URL: 'http://connector-service:4003',
      INTER_SERVICE_AUTH_TOKEN: 'inter-service-token-for-credential-spec',
    }),
  },
}));

vi.mock('../../../common/utilities', () => ({
  buildInterServiceAuthHeader: (): string => AUTH_HEADER,
  httpRequest: httpRequestMock,
}));

describe('ConnectorCredentialService', () => {
  beforeEach(() => {
    httpRequestMock.mockReset();
    httpRequestMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { apiKey: SECRET_KEY },
    });
  });

  it('sends the Service Authorization header on the connectors/config request', async () => {
    const service = new ConnectorCredentialService();

    await service.resolve('gemini');

    expect(httpRequestMock).toHaveBeenCalledTimes(1);
    const options = httpRequestMock.mock.calls[0]?.[0] as {
      url: string;
      headers?: Record<string, string>;
    };
    expect(options.url).toContain('/internal/connectors/config?provider=GEMINI');
    expect(options.headers?.['Authorization']).toBe(AUTH_HEADER);
  });

  it('never logs the token or the API key', async () => {
    const service = new ConnectorCredentialService();
    const logger = (service as unknown as { logger: Record<string, unknown> }).logger;
    const spies = ['debug', 'log', 'warn', 'error'].map((level) =>
      vi
        .spyOn(logger as { [k: string]: (...args: unknown[]) => void }, level)
        .mockImplementation(() => {}),
    );

    await service.resolve('gemini');
    httpRequestMock.mockRejectedValueOnce(new Error(`boom ${AUTH_HEADER}`));
    service.invalidate();
    await service.resolve('gemini');

    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain('inter-service-token-for-credential-spec');
    expect(logged).not.toContain(SECRET_KEY);
  });
});
