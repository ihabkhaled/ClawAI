import { Injectable } from '@nestjs/common';

import { DatetimeMathAdapter } from '../adapters/datetime-math.adapter';
import { WeatherAdapter } from '../adapters/weather.adapter';
import { WebFetchAdapter } from '../adapters/web-fetch.adapter';
import { type PluginAdapter } from '../types/plugin-adapter.types';

/** The in-process adapters, by the adapterKey a manifest names. Keys here must equal BUILTIN_ADAPTER_KEYS. */
@Injectable()
export class AdapterRegistryManager {
  private readonly adapters: ReadonlyMap<string, PluginAdapter>;

  constructor(
    webFetch: WebFetchAdapter,
    weather: WeatherAdapter,
    datetimeMath: DatetimeMathAdapter,
  ) {
    this.adapters = new Map<string, PluginAdapter>([
      ['web-fetch', webFetch],
      ['weather', weather],
      ['datetime-and-math', datetimeMath],
    ]);
  }

  keys(): string[] {
    return [...this.adapters.keys()];
  }

  /** The adapter for a key, or undefined for an unknown one (including prototype-chain names). */
  get(adapterKey: string): PluginAdapter | undefined {
    return this.adapters.get(adapterKey);
  }
}
