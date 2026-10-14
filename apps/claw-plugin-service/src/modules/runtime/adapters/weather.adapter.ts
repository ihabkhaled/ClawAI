import { Injectable } from '@nestjs/common';

import { AdapterFailureKind } from '../../../common/enums/adapter-failure-kind.enum';
import { EgressErrorCode } from '../../../common/enums/egress-error-code.enum';
import { EgressError } from '../../egress/errors/egress.error';
import { SafeEgressManager } from '../../egress/managers/safe-egress.manager';
import { WEB_FETCH_PORTS, WEB_FETCH_USER_AGENT } from '../constants/runtime.constants';
import {
  WEATHER_DEFAULT_DAYS,
  WEATHER_FORECAST_URL,
  WEATHER_GEOCODE_URL,
  WEATHER_MAX_DAYS,
  WEATHER_MAX_RESPONSE_BYTES,
  WEATHER_TOOL,
  WEATHER_UNAVAILABLE,
  WEATHER_UNITS_IMPERIAL,
  WEATHER_UNITS_METRIC,
} from '../constants/weather.constants';
import { AdapterError } from '../errors/adapter.error';
import {
  type ForecastResponse,
  forecastResponseSchema,
  type GeocodePlace,
  geocodeResponseSchema,
} from '../schemas/weather.schema';
import {
  type AdapterContext,
  type AdapterResult,
  type PluginAdapter,
} from '../types/plugin-adapter.types';
import { formatWeather } from '../utilities/format-weather.utility';

/**
 * Current weather and a short forecast from Open-Meteo. It reaches only the two hosts in the
 * manifest's network list, over https, behind the same egress guard as everything else. The
 * place name is the model's input, so it is sent as a query value only (never as a host or path).
 */
@Injectable()
export class WeatherAdapter implements PluginAdapter {
  constructor(private readonly egress: SafeEgressManager) {}

  async execute(
    context: AdapterContext,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<AdapterResult> {
    const location = args['location'];
    if (toolName !== WEATHER_TOOL || typeof location !== 'string' || location.trim() === '') {
      throw new AdapterError(AdapterFailureKind.BAD_INPUT, 'Unknown tool or missing location');
    }
    const days = this.daysOf(args['days']);
    const units =
      context.settings['units'] === WEATHER_UNITS_IMPERIAL
        ? WEATHER_UNITS_IMPERIAL
        : WEATHER_UNITS_METRIC;
    try {
      const place = await this.geocode(location.trim(), context);
      const forecast = await this.forecast(place, days, units, context);
      return {
        content: formatWeather(this.placeName(place), forecast, units),
        truncated: false,
      };
    } catch (error) {
      throw this.refine(error);
    }
  }

  private daysOf(raw: unknown): number {
    const days = typeof raw === 'number' && Number.isInteger(raw) ? raw : WEATHER_DEFAULT_DAYS;
    return Math.min(Math.max(days, 1), WEATHER_MAX_DAYS);
  }

  private async getJson(url: URL, context: AdapterContext): Promise<unknown> {
    const response = await this.egress.request({
      url: url.href,
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': WEB_FETCH_USER_AGENT },
      timeoutMs: context.timeoutMs,
      maxResponseBytes: WEATHER_MAX_RESPONSE_BYTES,
      signal: context.signal,
      allowedHosts: context.allowedHosts,
      allowedPorts: WEB_FETCH_PORTS,
    });
    if (response.status !== 200 || response.truncated) {
      throw new AdapterError(AdapterFailureKind.UNAVAILABLE, WEATHER_UNAVAILABLE);
    }
    try {
      return JSON.parse(response.body) as unknown;
    } catch {
      throw new AdapterError(AdapterFailureKind.UNAVAILABLE, WEATHER_UNAVAILABLE);
    }
  }

  private async geocode(location: string, context: AdapterContext): Promise<GeocodePlace> {
    const url = new URL(WEATHER_GEOCODE_URL);
    url.searchParams.set('name', location);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');
    const parsed = geocodeResponseSchema.safeParse(await this.getJson(url, context));
    if (!parsed.success)
      throw new AdapterError(AdapterFailureKind.UNAVAILABLE, WEATHER_UNAVAILABLE);
    const place = parsed.data.results?.at(0);
    if (place === undefined) {
      throw new AdapterError(AdapterFailureKind.BAD_INPUT, `No place was found for "${location}"`);
    }
    return place;
  }

  private async forecast(
    place: { latitude: number; longitude: number },
    days: number,
    units: string,
    context: AdapterContext,
  ): Promise<ForecastResponse> {
    const url = new URL(WEATHER_FORECAST_URL);
    url.searchParams.set('latitude', String(place.latitude));
    url.searchParams.set('longitude', String(place.longitude));
    url.searchParams.set(
      'current',
      'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
    );
    url.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
    );
    url.searchParams.set('forecast_days', String(days));
    url.searchParams.set('timezone', 'auto');
    if (units === WEATHER_UNITS_IMPERIAL) {
      url.searchParams.set('temperature_unit', 'fahrenheit');
      url.searchParams.set('wind_speed_unit', 'mph');
      url.searchParams.set('precipitation_unit', 'inch');
    }
    const parsed = forecastResponseSchema.safeParse(await this.getJson(url, context));
    if (!parsed.success) {
      throw new AdapterError(AdapterFailureKind.UNAVAILABLE, WEATHER_UNAVAILABLE);
    }
    return parsed.data;
  }

  private placeName(place: { name: string; admin1?: string; country?: string }): string {
    return [place.name, place.admin1, place.country]
      .filter((part) => part !== undefined)
      .join(', ');
  }

  private refine(error: unknown): Error {
    if (error instanceof AdapterError) return error;
    return error instanceof EgressError && error.code === EgressErrorCode.TIMEOUT
      ? new AdapterError(AdapterFailureKind.TIMEOUT, 'The weather service took too long')
      : new AdapterError(AdapterFailureKind.UNAVAILABLE, WEATHER_UNAVAILABLE);
  }
}
