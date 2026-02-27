/** 天气信息获取（Open-Meteo 免费 API，无需 API key） */

export interface WeatherInfo {
  temp: number;
  description: string;
}

const WEATHER_CODE_MAP: Record<number, { zh: string; en: string }> = {
  0:  { zh: '晴天', en: 'Clear' },
  1:  { zh: '多云', en: 'Cloudy' },
  2:  { zh: '多云', en: 'Cloudy' },
  3:  { zh: '多云', en: 'Cloudy' },
  45: { zh: '雾', en: 'Fog' },
  48: { zh: '雾', en: 'Fog' },
  51: { zh: '雨', en: 'Rain' },
  53: { zh: '雨', en: 'Rain' },
  55: { zh: '雨', en: 'Rain' },
  56: { zh: '雨', en: 'Rain' },
  57: { zh: '雨', en: 'Rain' },
  61: { zh: '雨', en: 'Rain' },
  63: { zh: '雨', en: 'Rain' },
  65: { zh: '雨', en: 'Rain' },
  66: { zh: '雨', en: 'Rain' },
  67: { zh: '雨', en: 'Rain' },
  71: { zh: '雪', en: 'Snow' },
  73: { zh: '雪', en: 'Snow' },
  75: { zh: '雪', en: 'Snow' },
  77: { zh: '雪', en: 'Snow' },
  80: { zh: '阵雨', en: 'Showers' },
  81: { zh: '阵雨', en: 'Showers' },
  82: { zh: '阵雨', en: 'Showers' },
  95: { zh: '雷暴', en: 'Thunderstorm' },
  96: { zh: '雷暴', en: 'Thunderstorm' },
  99: { zh: '雷暴', en: 'Thunderstorm' },
};

function getWeatherDescription(code: number, lang: 'zh' | 'en'): string {
  const entry = WEATHER_CODE_MAP[code];
  if (entry) return lang === 'zh' ? entry.zh : entry.en;
  // fallback by range
  if (code >= 1 && code <= 3) return lang === 'zh' ? '多云' : 'Cloudy';
  if (code >= 45 && code <= 48) return lang === 'zh' ? '雾' : 'Fog';
  if (code >= 51 && code <= 67) return lang === 'zh' ? '雨' : 'Rain';
  if (code >= 71 && code <= 77) return lang === 'zh' ? '雪' : 'Snow';
  if (code >= 80 && code <= 82) return lang === 'zh' ? '阵雨' : 'Showers';
  if (code >= 95 && code <= 99) return lang === 'zh' ? '雷暴' : 'Thunderstorm';
  return lang === 'zh' ? '未知' : 'Unknown';
}

export async function getWeather(
  lat: number,
  lng: number,
  lang: 'zh' | 'en' = 'zh',
): Promise<WeatherInfo | null> {
  try {
    // 输入校验：lat [-90,90], lng [-180,180]
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(500) });
    if (!resp.ok) return null;

    const data = (await resp.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };

    const temp = data.current?.temperature_2m;
    const code = data.current?.weather_code;
    if (temp == null || code == null) return null;

    return {
      temp: Math.round(temp),
      description: getWeatherDescription(code, lang),
    };
  } catch {
    return null;
  }
}
