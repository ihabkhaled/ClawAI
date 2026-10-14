import { WEATHER_CODE_LABELS, WEATHER_UNITS_IMPERIAL } from '../constants/weather.constants';
import { type ForecastResponse } from '../schemas/weather.schema';

function label(code: number): string {
  return WEATHER_CODE_LABELS.get(code) ?? 'unknown conditions';
}

/** Plain-text weather report: current conditions, then one line per forecast day. */
export function formatWeather(place: string, forecast: ForecastResponse, units: string): string {
  const imperial = units === WEATHER_UNITS_IMPERIAL;
  const temp = imperial ? '°F' : '°C';
  const speed = imperial ? 'mph' : 'km/h';
  const rain = imperial ? 'in' : 'mm';
  const { current, daily } = forecast;
  const lines = [
    `Weather for ${place}`,
    `Now: ${label(current.weather_code)}, ${String(current.temperature_2m)}${temp} (feels like ${String(current.apparent_temperature)}${temp}), humidity ${String(current.relative_humidity_2m)}%, wind ${String(current.wind_speed_10m)} ${speed}, precipitation ${String(current.precipitation)} ${rain}`,
    'Forecast:',
  ];
  for (const [index, day] of daily.time.entries()) {
    lines.push(
      `${day}: ${label(daily.weather_code.at(index) ?? -1)}, ${String(daily.temperature_2m_min.at(index) ?? '?')} to ${String(daily.temperature_2m_max.at(index) ?? '?')}${temp}, precipitation ${String(daily.precipitation_sum.at(index) ?? '?')} ${rain}`,
    );
  }
  return lines.join('\n');
}
