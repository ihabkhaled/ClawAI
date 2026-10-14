import { z } from 'zod';

export const geocodeResponseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string().max(200),
        country: z.string().max(100).optional(),
        admin1: z.string().max(100).optional(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
    )
    .max(10)
    .optional(),
});

export const forecastResponseSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    precipitation: z.number(),
    wind_speed_10m: z.number(),
    weather_code: z.number(),
  }),
  daily: z.object({
    time: z.array(z.string().max(20)).max(16),
    weather_code: z.array(z.number()).max(16),
    temperature_2m_max: z.array(z.number()).max(16),
    temperature_2m_min: z.array(z.number()).max(16),
    precipitation_sum: z.array(z.number()).max(16),
  }),
});

export type GeocodeResponse = z.infer<typeof geocodeResponseSchema>;
export type ForecastResponse = z.infer<typeof forecastResponseSchema>;
export type GeocodePlace = NonNullable<GeocodeResponse['results']>[number];
