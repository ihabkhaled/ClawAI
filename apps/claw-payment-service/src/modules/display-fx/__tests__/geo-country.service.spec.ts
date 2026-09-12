import { httpRequest } from '@claw/shared-utilities';
import { GeoCountrySource } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { type RedisService } from '../../../infrastructure/redis/redis.service';
import { GeoCountryService } from '../services/geo-country.service';

jest.mock('@claw/shared-utilities', () => ({
  ...jest.requireActual('@claw/shared-utilities'),
  httpRequest: jest.fn(),
}));

const mockHttp = httpRequest as unknown as jest.Mock;

function buildRedis(overrides: Partial<Record<string, unknown>> = {}): RedisService {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as RedisService;
}

function configure(edgeTrusted: 'true' | 'false'): void {
  jest.spyOn(AppConfig, 'get').mockReturnValue({
    DISPLAY_FX_TRUST_EDGE_COUNTRY_HEADER: edgeTrusted,
  } as unknown as ReturnType<typeof AppConfig.get>);
}

describe('GeoCountryService', () => {
  beforeEach(() => {
    mockHttp.mockReset();
    configure('false');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('header spoofing', () => {
    it('ignores CF-IPCountry while the edge is not trusted', async () => {
      // ClawAI is not behind Cloudflare. A CF-IPCountry arriving at the origin
      // was written by whoever sent the request.
      const service = new GeoCountryService(buildRedis());
      const resolved = await service.resolve({ 'cf-ipcountry': 'EG' });

      expect(resolved.countryCode).toBeNull();
      expect(mockHttp).not.toHaveBeenCalled();
    });

    it('never geolocates an address the client supplied', async () => {
      // X-Forwarded-For is APPENDED to by nginx, so its head is attacker
      // controlled forever. Trusting it would let anyone pick their country.
      const service = new GeoCountryService(buildRedis());
      const resolved = await service.resolve({
        'x-forwarded-for': '41.33.10.5',
        'true-client-ip': '41.33.10.5',
        'cf-connecting-ip': '41.33.10.5',
      });

      expect(resolved.countryCode).toBeNull();
      expect(mockHttp).not.toHaveBeenCalled();
    });

    it('uses CF-IPCountry once an operator has turned it on', async () => {
      configure('true');
      const service = new GeoCountryService(buildRedis());
      const resolved = await service.resolve({ 'cf-ipcountry': 'eg' });

      expect(resolved.countryCode).toBe('EG');
      expect(resolved.source).toBe(GeoCountrySource.EDGE_HEADER);
    });

    it('treats the edge unknown markers as unknown', async () => {
      configure('true');
      const service = new GeoCountryService(buildRedis());
      for (const value of ['XX', 'T1', '', 'EGYPT', '1']) {
        const resolved = await service.resolve({ 'cf-ipcountry': value });
        expect(resolved.countryCode).toBeNull();
      }
    });
  });

  describe('IP lookup', () => {
    it('resolves a country from the address nginx observed', async () => {
      mockHttp.mockResolvedValue({
        ok: true,
        status: 200,
        data: { ip: '41.33.10.5', country: 'EG' },
      });
      const service = new GeoCountryService(buildRedis());
      const resolved = await service.resolve({ 'x-real-ip': '41.33.10.5' });

      expect(resolved).toEqual({ countryCode: 'EG', source: GeoCountrySource.IP_LOOKUP });
    });

    it('sends the address and nothing else', async () => {
      mockHttp.mockResolvedValue({ ok: true, status: 200, data: { country: 'EG' } });
      const service = new GeoCountryService(buildRedis());
      await service.resolve({
        'x-real-ip': '41.33.10.5',
        cookie: 'session=secret',
        authorization: 'Bearer token',
      });

      const options = mockHttp.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(options['url']).toBe('https://api.country.is/41.33.10.5');
      expect(JSON.stringify(options)).not.toContain('secret');
      expect(JSON.stringify(options)).not.toContain('Bearer');
    });

    it('does not call upstream for an address that never crossed the internet', async () => {
      const service = new GeoCountryService(buildRedis());
      for (const ip of ['127.0.0.1', '172.18.0.4', '10.1.2.3', '192.168.0.9', '::1']) {
        const resolved = await service.resolve({ 'x-real-ip': ip });
        expect(resolved.countryCode).toBeNull();
      }
      expect(mockHttp).not.toHaveBeenCalled();
    });

    it('degrades quietly on a timeout, a 429 and a 5xx', async () => {
      const service = new GeoCountryService(buildRedis());
      mockHttp.mockRejectedValue(new Error('aborted'));
      expect((await service.resolve({ 'x-real-ip': '41.33.10.5' })).countryCode).toBeNull();
      mockHttp.mockResolvedValue({ ok: false, status: 429, data: null });
      expect((await service.resolve({ 'x-real-ip': '41.33.10.5' })).countryCode).toBeNull();
      mockHttp.mockResolvedValue({ ok: false, status: 503, data: null });
      expect((await service.resolve({ 'x-real-ip': '41.33.10.5' })).countryCode).toBeNull();
    });

    it('rejects a malformed or nonsense upstream answer', async () => {
      const service = new GeoCountryService(buildRedis());
      for (const data of [null, {}, { country: 'EGYPT' }, { country: '' }, { country: 'XX' }]) {
        mockHttp.mockResolvedValue({ ok: true, status: 200, data });
        expect((await service.resolve({ 'x-real-ip': '41.33.10.5' })).countryCode).toBeNull();
      }
    });
  });

  describe('privacy', () => {
    it('caches by hash and never writes the address down', async () => {
      mockHttp.mockResolvedValue({ ok: true, status: 200, data: { country: 'EG' } });
      const redis = buildRedis();
      const service = new GeoCountryService(redis);
      await service.resolve({ 'x-real-ip': '41.33.10.5' });

      const [key, value] = (redis.set as jest.Mock).mock.calls[0] as [string, string];
      expect(key).not.toContain('41.33.10.5');
      expect(value).toBe('EG');
    });

    it('reuses a cached country without calling upstream again', async () => {
      const redis = buildRedis({ get: jest.fn().mockResolvedValue('EG') });
      const service = new GeoCountryService(redis);
      const resolved = await service.resolve({ 'x-real-ip': '41.33.10.5' });

      expect(resolved.countryCode).toBe('EG');
      expect(mockHttp).not.toHaveBeenCalled();
    });
  });
});
