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
  const heaterStatusLabel = weatherStatus === 'loading' ? '判断中' : heaterRequired ? '建议需要' : '暂不需要';
  const heaterStatusDetail = weatherStatus === 'unavailable'
    ? '天气暂不可用'
    : heaterRequired
      ? `${heaterSpeciesCount} 种需恒温`
      : '当前生物耐温较宽';
  const thermometerLevel = typeof weatherTemperatureValue === 'number'
    ? Math.min(92, Math.max(12, Math.round(((weatherTemperatureValue + 5) / 45) * 100)))
    : 38;
  const heaterTone = heaterRequired
    ? 'border-red-100 bg-red-50 text-red-600'
    : 'border-emerald-100 bg-emerald-50 text-emerald-700';

  return (
    <section className="grid min-w-0 grid-cols-[48px_1fr] items-center gap-3 rounded-sm border border-border bg-white p-3 shadow-sm">
      <div className="relative mx-auto h-24 w-9">
        <div className="absolute left-1/2 top-0 h-[76px] w-4 -translate-x-1/2 rounded-full border-2 border-ink/20 bg-sky-50">
          <div
            className={`absolute bottom-1 left-1/2 w-2.5 -translate-x-1/2 rounded-full transition-all ${heaterRequired ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ height: `${thermometerLevel}%` }}
          />
        </div>
        <div className={`absolute bottom-0 left-1/2 h-9 w-9 -translate-x-1/2 rounded-full border-2 border-white shadow-sm ${heaterRequired ? 'bg-red-500' : 'bg-emerald-500'}`}>
          <Thermometer className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-white" />
        </div>
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/40">本地温控</p>
            <h3 className="text-[17px] font-black leading-tight text-ink">加热棒提醒</h3>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${heaterTone}`}>
            {heaterStatusLabel}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-sm bg-bg px-2 py-2">
            <p className="text-[9px] font-bold text-ink/45">当地</p>
            <p className="mt-0.5 truncate text-[12px] font-black text-ink">{weatherStatus === 'loading' ? '定位中' : weatherLocation}</p>
          </div>
          <div className="rounded-sm bg-bg px-2 py-2">
            <p className="text-[9px] font-bold text-ink/45">当地温度</p>
            <p className="mt-0.5 text-[12px] font-black text-ink">{weatherTemperature || '--°C'}</p>
          </div>
          <div className="rounded-sm bg-bg px-2 py-2">
            <p className="text-[9px] font-bold text-ink/45">判断</p>
            <p className="mt-0.5 truncate text-[12px] font-black text-ink">{heaterStatusDetail}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] font-medium text-ink/45">以缸内温度计为准，天气只做辅助提醒。</p>
      </div>
    </section>
  );
}

