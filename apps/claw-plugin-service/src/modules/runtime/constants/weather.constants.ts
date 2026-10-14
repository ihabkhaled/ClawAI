export const WEATHER_TOOL = 'get_weather';
export const WEATHER_GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const WEATHER_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const WEATHER_MAX_RESPONSE_BYTES = 65_536;
export const WEATHER_DEFAULT_DAYS = 3;
export const WEATHER_MAX_DAYS = 7;
export const WEATHER_UNAVAILABLE = 'The weather service could not be reached right now.';

/** WMO weather interpretation codes as Open-Meteo reports them. */
export const WEATHER_CODE_LABELS: ReadonlyMap<number, string> = new Map([
  [0, 'clear sky'],
  [1, 'mainly clear'],
  [2, 'partly cloudy'],
  [3, 'overcast'],
  [45, 'fog'],
  [48, 'depositing rime fog'],
  [51, 'light drizzle'],
  [53, 'moderate drizzle'],
  [55, 'dense drizzle'],
  [56, 'light freezing drizzle'],
  [57, 'dense freezing drizzle'],
  [61, 'slight rain'],
  [63, 'moderate rain'],
  [65, 'heavy rain'],
  [66, 'light freezing rain'],
  [67, 'heavy freezing rain'],
  [71, 'slight snow'],
  [73, 'moderate snow'],
  [75, 'heavy snow'],
  [77, 'snow grains'],
  [80, 'slight rain showers'],
  [81, 'moderate rain showers'],
  [82, 'violent rain showers'],
  [85, 'slight snow showers'],
  [86, 'heavy snow showers'],
  [95, 'thunderstorm'],
  [96, 'thunderstorm with slight hail'],
  [99, 'thunderstorm with heavy hail'],
]);

export const WEATHER_UNITS_METRIC = 'metric';
export const WEATHER_UNITS_IMPERIAL = 'imperial';
