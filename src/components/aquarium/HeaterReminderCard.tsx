import { Thermometer } from 'lucide-react';
import type { LocalWeatherOutput } from '../../services/weather/weather.schema';

type WeatherStatus = 'loading' | 'ready' | 'unavailable';

interface HeaterReminderCardProps {
  localWeather: LocalWeatherOutput | null;
  weatherStatus: WeatherStatus;
  heaterSpeciesCount: number;
}

const formatWeatherLocation = (weather: LocalWeatherOutput | null) => (
  [weather?.city, weather?.region].filter(Boolean).join(' · ') || '当前位置'
);

const formatTemperature = (value?: number) => (
  typeof value === 'number' ? `${Math.round(value)}°C` : ''
);

export function HeaterReminderCard({
  localWeather,
  weatherStatus,
  heaterSpeciesCount,
}: HeaterReminderCardProps) {
  const weatherLocation = formatWeatherLocation(localWeather);
  const weatherTemperatureValue = localWeather?.apparentTemperatureC ?? localWeather?.temperatureC;
  const weatherTemperature = formatTemperature(weatherTemperatureValue);
  const heaterRequired = heaterSpeciesCount > 0;
  const heaterStatusLabel = weatherStatus === 'loading' ? (isEn ? 'Checking' : '判断中') : heaterRequired ? (isEn ? 'Recommended' : '建议需要') : (isEn ? 'Not Required' : '暂不需要');
  const heaterStatusDetail = weatherStatus === 'unavailable'
    ? (isEn ? 'Weather Unavailable' : '天气暂不可用')
    : heaterRequired
      ? (isEn ? `${heaterSpeciesCount} species need constant temp` : `${heaterSpeciesCount} 种需恒温`)
      : (isEn ? 'Broad temp tolerance' : '当前生物耐温较宽');
  const thermometerLevel = typeof weatherTemperatureValue === 'number'
    ? Math.min(92, Math.max(12, Math.round(((weatherTemperatureValue + 5) / 45) * 100)))
    : 38;
  const heaterTone = heaterRequired
    ? 'border-red-100 bg-red-50 text-red-600'
    : 'border-emerald-100 bg-emerald-50 text-emerald-700';

  return (
    <section className="flex h-full min-w-0 flex-col justify-between gap-2 rounded-sm border border-border bg-white p-2.5 shadow-sm">
      <div className="flex min-w-0 items-start gap-2">
        <div className="relative h-12 w-6 shrink-0">
        <div className="absolute left-1/2 top-0 h-9 w-3 -translate-x-1/2 rounded-full border-2 border-ink/20 bg-sky-50">
          <div
            className={`absolute bottom-0.5 left-1/2 w-1.5 -translate-x-1/2 rounded-full transition-all ${heaterRequired ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ height: `${thermometerLevel}%` }}
          />
        </div>
        <div className={`absolute bottom-0 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white shadow-sm ${heaterRequired ? 'bg-red-500' : 'bg-emerald-500'}`}>
          <Thermometer className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white" />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-ink/40">{isEn ? 'Temp Control' : '本地温控'}</p>
        <h3 className="mt-0.5 truncate text-[13px] font-black leading-tight text-ink">{isEn ? 'Heater Reminder' : '加热棒提醒'}</h3>
        <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${heaterTone}`}>
            {heaterStatusLabel}
          </span>
      </div>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-1.5">
        <div className="rounded-sm bg-bg px-2 py-1.5">
          <p className="text-[9px] font-bold text-ink/45">{isEn ? 'Temp' : '温度'}</p>
          <p className="mt-0.5 truncate text-[11px] font-black text-ink">{weatherTemperature || '--°C'}</p>
        </div>
        <div className="rounded-sm bg-bg px-2 py-1.5">
          <p className="text-[9px] font-bold text-ink/45">{isEn ? 'Status' : '判断'}</p>
          <p className="mt-0.5 truncate text-[11px] font-black text-ink">{heaterStatusDetail}</p>
        </div>
      </div>
      <p className="truncate text-[9px] font-medium text-ink/40">{weatherStatus === 'loading' ? '定位中' : weatherLocation}</p>
    </section>
  );
}
