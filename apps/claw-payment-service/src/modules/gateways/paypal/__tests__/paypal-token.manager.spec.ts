import { vi } from 'vitest';
import { resetInternalHostAllowlist } from '@claw/shared-utilities';
import { AppConfig } from '../../../../app/config/app.config';
import { PaypalTokenManager } from '../managers/paypal-token.manager';
import { GatewayMode } from '../../../gateway-config/enums/gateway-mode.enum';

const fetchMock = vi.fn();

const tokenOk = (expiresIn: number): Response =>
  new Response(
    JSON.stringify({ access_token: 'tok-1', token_type: 'Bearer', expires_in: expiresIn }),
    { status: 200 },
  );

describe('PaypalTokenManager', () => {
  let manager: PaypalTokenManager;
  const runtimeConfig = {
    getPaypalOperations: vi.fn(),
  };

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      PAYPAL_ENV: 'sandbox',
      PAYPAL_CLIENT_ID: 'id',
      PAYPAL_CLIENT_SECRET: 'secret',
      PAYPAL_WEBHOOK_ID: 'WH1',
      PAYMENT_GATEWAY_TIMEOUT_MS: 10_000,
    } as unknown as ReturnType<typeof AppConfig.get>);
    runtimeConfig.getPaypalOperations.mockResolvedValue({
      clientId: 'id',
      clientSecret: 'secret',
      webhookId: 'WH1',
      mode: GatewayMode.SANDBOX,
    });
    manager = new PaypalTokenManager(runtimeConfig as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches a token on first use', async () => {
    fetchMock.mockResolvedValue(tokenOk(32_400));
    await expect(manager.getAccessToken(0)).resolves.toBe('tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reuses the cached token while it is still valid', async () => {
    fetchMock.mockImplementation(async () => tokenOk(3_600));
    await manager.getAccessToken(0);
    await manager.getAccessToken(1_000_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes BEFORE the token actually expires', async () => {
    // The 60s margin exists so a token cannot expire in flight — valid when
    // checked, dead by the time the request lands, surfacing as a random 401
    // in the middle of a payment.
    fetchMock.mockImplementation(async () => tokenOk(3_600));
    await manager.getAccessToken(0);
    // 3540s in: PayPal still considers it valid, but we are inside the margin.
    await manager.getAccessToken(3_540_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('re-authenticates after invalidate()', async () => {
    fetchMock.mockImplementation(async () => tokenOk(3_600));
    await manager.getAccessToken(0);
    manager.invalidate();
    await manager.getAccessToken(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('posts form-encoded credentials, not JSON', async () => {
    fetchMock.mockResolvedValue(tokenOk(3_600));
    await manager.getAccessToken(0);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = new Headers(request?.headers);
    expect(headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
    expect(request?.body).toBe('grant_type=client_credentials');
    expect(headers.get('Authorization')).toMatch(/^Basic /);
  });

  it('refuses when PayPal credentials are absent', async () => {
    runtimeConfig.getPaypalOperations.mockRejectedValue(new Error('missing credentials'));
    await expect(manager.getAccessToken(0)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when PayPal rejects the credentials', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(manager.getAccessToken(0)).rejects.toThrow();
  });

  it('throws when the token response fails schema validation', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ token_type: 'Bearer' })));
    await expect(manager.getAccessToken(0)).rejects.toThrow();
  });

  // TD-040. The token request carries the client secret. These run with a
  // CI-shaped environment — a GitHub runner defines `*_ENDPOINT` variables,
  // which makes the host check ENFORCE rather than stand down — so they prove
  // both real PayPal hosts are still reachable, not that the check was skipped.
  describe('outbound URL guard', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      resetInternalHostAllowlist();
    });

    function enforceLikeCi(): void {
      vi.stubEnv('ACTIONS_RESULTS_ENDPOINT', 'https://x.example');
      resetInternalHostAllowlist();
    }

    it.each([
      [GatewayMode.SANDBOX, 'api-m.sandbox.paypal.com'],
      [GatewayMode.LIVE, 'api-m.paypal.com'],
    ])(
      'reaches the %s host with enforcement on, and never follows a redirect',
      async (mode, host) => {
        enforceLikeCi();
        runtimeConfig.getPaypalOperations.mockResolvedValue({
          clientId: 'id',
          clientSecret: 'secret',
          webhookId: 'WH1',
          mode,
        });
        fetchMock.mockResolvedValue(tokenOk(3_600));

        await expect(manager.getAccessToken(0)).resolves.toBe('tok-1');

        const [target, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
        expect(new URL(String(target)).host).toBe(host);
        expect(init.redirect).toBe('error');
      },
    );

    it('refuses a host that is not a PayPal endpoint when enforcement is on', async () => {
      enforceLikeCi();
      vi.spyOn(PaypalTokenManager, 'baseUrl').mockReturnValue('https://api-m.paypal.com.evil.test');

      await expect(manager.getAccessToken(0)).rejects.toThrow(/does not call/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      ['a file: URL', 'file:///etc'],
      ['embedded credentials', 'https://user:pass@api-m.paypal.com'],
      ['the cloud metadata address', 'http://169.254.169.254'],
    ])('refuses %s before the client secret is sent', async (_label, hostile) => {
      vi.spyOn(PaypalTokenManager, 'baseUrl').mockReturnValue(hostile);

      await expect(manager.getAccessToken(0)).rejects.toThrow(/httpRequest/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('targets the sandbox host in sandbox mode and the live host in live mode', () => {
    expect(PaypalTokenManager.baseUrl(GatewayMode.SANDBOX)).toContain('sandbox');
    expect(PaypalTokenManager.baseUrl(GatewayMode.LIVE)).not.toContain('sandbox');
  });
});
