import type { WeatherForecastDay, WeatherSnapshot } from '../../src/shared/types'

const BASE_URL = 'https://api.openweathermap.org/data/2.5'

interface CurrentWeatherResponse {
  name: string
  weather: { main: string; description: string; icon: string }[]
  main: { temp: number; feels_like: number; humidity: number }
  wind: { speed: number }
}

interface ForecastEntry {
  dt_txt: string
  main: { temp_min: number; temp_max: number }
  weather: { main: string; icon: string }[]
}

interface ForecastResponse {
  list: ForecastEntry[]
}

async function owmFetch<T>(path: string, apiKey: string, location: string): Promise<T> {
  const url = `${BASE_URL}${path}?q=${encodeURIComponent(location)}&appid=${apiKey}&units=imperial`
  const res = await fetch(url)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(body.message ? `Weather API error: ${body.message}` : `Weather API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchWeather(apiKey: string, location: string): Promise<WeatherSnapshot> {
  const [current, forecast] = await Promise.all([
    owmFetch<CurrentWeatherResponse>('/weather', apiKey, location),
    owmFetch<ForecastResponse>('/forecast', apiKey, location),
  ])

  const byDay = new Map<string, ForecastEntry[]>()
  for (const entry of forecast.list) {
    const date = entry.dt_txt.slice(0, 10)
    if (!byDay.has(date)) byDay.set(date, [])
    byDay.get(date)!.push(entry)
  }

  const today = new Date().toISOString().slice(0, 10)
  const days: WeatherForecastDay[] = Array.from(byDay.entries())
    .filter(([date]) => date !== today)
    .slice(0, 5)
    .map(([date, entries]) => {
      const highF = Math.round(Math.max(...entries.map((e) => e.main.temp_max)))
      const lowF = Math.round(Math.min(...entries.map((e) => e.main.temp_min)))
      const midday = entries.find((e) => e.dt_txt.includes('12:00:00')) ?? entries[Math.floor(entries.length / 2)]
      return {
        date,
        highF,
        lowF,
        condition: midday.weather[0]?.main ?? 'Unknown',
        icon: midday.weather[0]?.icon ?? '01d',
      }
    })

  return {
    locationName: current.name || location,
    tempF: Math.round(current.main.temp),
    feelsLikeF: Math.round(current.main.feels_like),
    condition: current.weather[0]?.description ?? null,
    icon: current.weather[0]?.icon ?? null,
    humidity: current.main.humidity,
    windMph: Math.round(current.wind.speed),
    forecast: days,
    syncedAt: new Date().toISOString(),
  }
}
