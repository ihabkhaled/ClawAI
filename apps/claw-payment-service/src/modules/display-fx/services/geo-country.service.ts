import { Injectable, Logger } from '@nestjs/common';
import {
  GEO_COUNTRY_CACHE_TTL_MS,
  GEO_COUNTRY_LOOKUP_URL,
  GEO_LOOKUP_TIMEOUT_MS,
  isValidCountryCode,
} from '@claw/shared-constants';
import { GeoCountrySource, HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { EDGE_COUNTRY_HEADER, GEO_COUNTRY_CACHE_PREFIX } from '../constants/display-fx.constants';
import { countryIsResponseSchema } from '../schemas/display-fx.schema';
import { hashClientIp, resolveTrustedClientIp } from '../service.utilities/client-ip.utility';
import { type ResolvedCountry } from '../types/display-fx.types';

// Where a visitor probably is. Convenience data, never identity.
//
// This result decides a default currency and nothing else. It is not evidence
// of residence, tax status, sanction exposure or payment eligibility, and the
// moment it is used for any of those it becomes a security control derived from
// a header an attacker can influence.
@Injectable()
export class GeoCountryService {
  private readonly logger = new Logger(GeoCountryService.name);

  constructor(private readonly redis: RedisService) {}

  async resolve(headers: Record<string, string | string[] | undefined>): Promise<ResolvedCountry> {
    const edge = this.readEdgeCountry(headers);
    if (edge !== null) {
      return { countryCode: edge, source: GeoCountrySource.EDGE_HEADER };
    }

    const ip = resolveTrustedClientIp(headers);
    if (ip === null) {
      // Local development, a health check, or a request that never crossed the
      // internet. Not worth an upstream call to be told nothing.
      return { countryCode: null, source: GeoCountrySource.UNRESOLVED };
    }

    const country = await this.lookupCountry(ip);
    return country === null
      ? { countryCode: null, source: GeoCountrySource.UNRESOLVED }
      : { countryCode: country, source: GeoCountrySource.IP_LOOKUP };
  }

  // The edge header is only believable on a deployment whose edge REWRITES it.
  // ClawAI's nginx terminates TLS directly today, so this stays off until an
  // operator turns it on — a header the public can set is not a country signal,
  // it is a suggestion from the visitor.
  private readEdgeCountry(headers: Record<string, string | string[] | undefined>): string | null {
    if (AppConfig.get().DISPLAY_FX_TRUST_EDGE_COUNTRY_HEADER !== 'true') {
      return null;
    }
    const raw = headers[EDGE_COUNTRY_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value === undefined) {
      return null;
    }
    const normalized = value.trim().toUpperCase();
    // XX is "could not resolve" and T1 is a Tor exit node. Both are honest
    // answers meaning unknown, and neither is a country.
    return isValidCountryCode(normalized) ? normalized : null;
  }

  private async lookupCountry(ip: string): Promise<string | null> {
    const cacheKey = `${GEO_COUNTRY_CACHE_PREFIX}:${hashClientIp(ip)}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached !== null) {
      return isValidCountryCode(cached) ? cached.toUpperCase() : null;
    }

    try {
      // The address and nothing else. No user id, no token, no cookie, no path
      // — country.is needs an IP to answer and anything more is data given away
      // for free.
      const response = await httpRequest<unknown>({
        url: `${GEO_COUNTRY_LOOKUP_URL}/${ip}`,
        method: HttpMethod.GET,
        timeoutMs: GEO_LOOKUP_TIMEOUT_MS,
      });
      if (!response.ok) {
        return null;
      }
      const parsed = countryIsResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        return null;
      }
      const country = parsed.data.country.trim().toUpperCase();
      if (!isValidCountryCode(country)) {
        return null;
      }
      // Keyed by hash, expires on its own. No raw address is ever written down.
      await this.redis
        .set(cacheKey, country, Math.floor(GEO_COUNTRY_CACHE_TTL_MS / 1_000))
        .catch(() => {});
      return country;
    } catch (error) {
      this.logger.warn(`lookupCountry: geo upstream failed - ${(error as Error).message}`);
      return null;
    }
  }
}
