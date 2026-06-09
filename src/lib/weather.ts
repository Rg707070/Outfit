import type { Season } from '@/types/database'

export interface WeatherData {
  temp: number
  feels_like: number
  description: string
  city: string
  icon: string
}

export type TempBand = 'cold' | 'cool' | 'mild' | 'warm' | 'hot'

/** Coarse temperature band used for outfit guidance (°C). */
export function tempBand(temp: number): TempBand {
  if (temp <= 8) return 'cold'
  if (temp <= 16) return 'cool'
  if (temp <= 23) return 'mild'
  if (temp <= 29) return 'warm'
  return 'hot'
}

/**
 * Seasons that suit a given temperature. Driven by the actual temperature
 * rather than the calendar so it works in any climate / hemisphere.
 */
export function tempToSeasons(temp: number): Season[] {
  switch (tempBand(temp)) {
    case 'cold': return ['winter']
    case 'cool': return ['autumn', 'winter']
    case 'mild': return ['spring', 'autumn']
    case 'warm': return ['spring', 'summer']
    case 'hot': return ['summer']
  }
}

/** Fetch current weather from OpenWeatherMap. Returns null on a bad response. */
export async function fetchWeatherByCoords(
  lat: number,
  lon: number,
  apiKey: string,
): Promise<WeatherData | null> {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`,
  )
  if (!res.ok) return null
  const data = await res.json()
  return {
    temp: Math.round(data.main.temp),
    feels_like: Math.round(data.main.feels_like),
    description: data.weather[0].description,
    city: data.name,
    icon: data.weather[0].icon,
  }
}

/**
 * Resolve the user's current weather via geolocation, falling back to demo
 * data when geolocation is denied or no API key is configured. Always resolves
 * (never rejects) so callers don't need their own error handling.
 */
export function getWeather(demo: { description: string; city: string }): Promise<WeatherData> {
  const fallback: WeatherData = { temp: 22, feels_like: 20, icon: '02d', ...demo }
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(fallback)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY
        if (!apiKey || apiKey === 'demo') return resolve(fallback)
        try {
          resolve((await fetchWeatherByCoords(coords.latitude, coords.longitude, apiKey)) ?? fallback)
        } catch {
          resolve(fallback)
        }
      },
      () => resolve(fallback),
    )
  })
}
