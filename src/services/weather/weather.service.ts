import { loggerService } from '../logger/logger.service';
import {
  ipLocationSchema,
  localWeatherInputSchema,
  localWeatherOutputSchema,
  LocalWeatherOutput,
  openMeteoCurrentSchema,
} from './weather.schema';

const fetchJsonWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const weatherService = {
  getLocalWeather: async (input: unknown = {}): Promise<LocalWeatherOutput> => {
    const parsed = localWeatherInputSchema.safeParse(input);
    if (!parsed.success) {
      loggerService.warn({
        module: 'weather',
        action: 'getLocalWeather',
        message: 'Weather input failed schema validation',
        details: parsed.error.flatten(),
      });
      return { ok: false, message: '天气参数无效，暂时无法获取本地天气。' };
    }

    try {
      const locationJson = await fetchJsonWithTimeout('https://ipapi.co/json/', parsed.data.timeoutMs);
      const location = ipLocationSchema.parse(locationJson);
      const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
      weatherUrl.searchParams.set('latitude', String(location.latitude));
      weatherUrl.searchParams.set('longitude', String(location.longitude));
      weatherUrl.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code');
      weatherUrl.searchParams.set('temperature_unit', 'celsius');
      weatherUrl.searchParams.set('timezone', 'auto');

      const weatherJson = await fetchJsonWithTimeout(weatherUrl.toString(), parsed.data.timeoutMs);
      const weather = openMeteoCurrentSchema.parse(weatherJson);
      const output = localWeatherOutputSchema.parse({
        ok: true,
        city: location.city,
        region: location.region,
        countryName: location.country_name,
        temperatureC: weather.current.temperature_2m,
        apparentTemperatureC: weather.current.apparent_temperature,
        weatherCode: weather.current.weather_code,
        observedAt: weather.current.time,
        source: 'ipapi-open-meteo',
      });

      loggerService.info({
        module: 'weather',
        action: 'getLocalWeather',
        message: 'Local weather loaded',
        details: { city: output.city, temperatureC: output.temperatureC },
      });

      return output;
    } catch (error) {
      loggerService.warn({
        module: 'weather',
        action: 'getLocalWeather',
        message: 'Local weather request failed',
        details: error,
      });
      return localWeatherOutputSchema.parse({
        ok: false,
        message: '暂时无法获取本地天气，但需要加热的生物仍会显示“需加热”标签。',
      });
    }
  },
};
