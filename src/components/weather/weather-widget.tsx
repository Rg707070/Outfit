'use client'
import { useEffect, useState } from 'react'
import { Cloud, Sun, CloudRain, Snowflake, Wind } from 'lucide-react'
import { useLang } from '@/lib/lang-context'
import { getWeather, type WeatherData } from '@/lib/weather'

function WeatherIcon({ description }: { description: string }) {
  const d = description.toLowerCase()
  if (d.includes('rain') || d.includes('drizzle')) return <CloudRain size={20} className="text-blue-400" />
  if (d.includes('snow')) return <Snowflake size={20} className="text-blue-200" />
  if (d.includes('wind')) return <Wind size={20} className="text-gray-400" />
  if (d.includes('cloud')) return <Cloud size={20} className="text-gray-400" />
  return <Sun size={20} className="text-yellow-400" />
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useLang()

  useEffect(() => {
    getWeather({ description: t.weather.demo, city: t.weather.demoCity })
      .then(setWeather)
      .finally(() => setLoading(false))
  }, [t])

  if (loading) return <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />

  if (!weather) return null

  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl px-4 py-3 border border-sky-100">
      <WeatherIcon description={weather.description} />
      <div>
        <p className="text-sm font-semibold text-gray-900">{weather.temp}°C — {weather.description}</p>
        <p className="text-xs text-gray-500">{t.weather.feelsLike(weather.feels_like, weather.city)}</p>
      </div>
    </div>
  )
}
