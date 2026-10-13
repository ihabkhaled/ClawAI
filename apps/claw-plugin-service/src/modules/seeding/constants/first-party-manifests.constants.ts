import { type PluginManifestInput } from '../../catalog/schemas/plugin-manifest.schema';
import { DATETIME_AND_MATH_MANIFEST } from './manifests/datetime-and-math.manifest';
import { WEATHER_MANIFEST } from './manifests/weather.manifest';
import { WEB_FETCH_MANIFEST } from './manifests/web-fetch.manifest';

export const FIRST_PARTY_MANIFESTS: readonly PluginManifestInput[] = [
  WEB_FETCH_MANIFEST,
  DATETIME_AND_MATH_MANIFEST,
  WEATHER_MANIFEST,
];
