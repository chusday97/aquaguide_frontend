import { z } from 'zod';

export const localWeatherInputSchema = z.object({
  timeoutMs: z.number().int().min(1000).max(15000).default(8000),
});

export const ipLocationSchema = z.object({
  city: z.string().optional().default('当前位置'),
  region: z.string().optional().default(''),
  country_name: z.string().optional().default(''),
  latitude: z.union([z.number(), z.string()]).transform(Number),
  longitude: z.union([z.number(), z.string()]).transform(Number),
}).refine((data) => Number.isFinite(data.latitude) && Number.isFinite(data.longitude), {
  message: 'Invalid IP location coordinates',
});

export const openMeteoCurrentSchema = z.object({
  current: z.object({
    time: z.string().optional(),
    temperature_2m: z.number(),
    apparent_temperature: z.number().optional(),
    weather_code: z.number().optional(),
  }),
});

export const localWeatherOutputSchema = z.object({
  ok: z.boolean(),
  city: z.string().optional(),
  region: z.string().optional(),
  countryName: z.string().optional(),
  temperatureC: z.number().optional(),
  apparentTemperatureC: z.number().optional(),
  weatherCode: z.number().optional(),
  observedAt: z.string().optional(),
  source: z.literal('ipapi-open-meteo').optional(),
  message: z.string().optional(),
});

export type LocalWeatherInput = z.infer<typeof localWeatherInputSchema>;
export type LocalWeatherOutput = z.infer<typeof localWeatherOutputSchema>;
