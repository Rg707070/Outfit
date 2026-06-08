'use client'
import { useEffect, useState } from 'react'
import { Cloud, Sun, CloudRain, Snowflake, Wind } from 'lucide-react'
import { useLang } from '@/lib/lang-context'

interface WeatherData {
  temp: number
  feels_like: number
  description: string
  city: string
  icon: string
}

function WeatherIcon({ description }: { description: string }) {
  const d = description.toLowerCase()
  if (d.includes('rain') || d.includes('drizzle'))
    return <CloudRain size={20} className="text-blue-400" />
  if (d.includes('snow')) return <Snowflake size={20} className="text-blue-200" />
  if (d.includes('wind')) return <Wind size={20} className="text-gray-400" />
  if (d.includes('cloud')) return <Cloud size={20} className="text-gray-400" />
  return <Sun size={20} className="text-yellow-400" />
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(() => {
    if (typeof navigator === 'undefined') return false
    return !!navigator.geolocation
  })
  const { t } = useLang()

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY
          if (!apiKey || apiKey === 'demo') {
            // Demo data
            setWeather({
              temp: 22,
              feels_like: 20,
              description: t.weather.demo,
              city: t.weather.demoCity,
              icon: '02d',
            })
            return
          }
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&appid=${apiKey}&units=metric`
          )
          const data = await res.json()
          setWeather({
            temp: Math.round(data.main.temp),
            feels_like: Math.round(data.main.feels_like),
            description: data.weather[0].description,
            city: data.name,
            icon: data.weather[0].icon,
          })
        } catch {
          setWeather({
            temp: 22,
            feels_like: 20,
            description: t.weather.demo,
            city: t.weather.demoCity,
            icon: '02d',
          })
        } finally {
          setLoading(false)
        }
      },
      () => {
        setWeather({
          temp: 22,
          feels_like: 20,
          description: t.weather.demo,
          city: t.weather.demoCity,
          icon: '02d',
        })
        setLoading(false)
      }
    )
  }, [t])

  if (loading) return <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />

  if (!weather) return null

  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl px-4 py-3 border border-sky-100">
      <WeatherIcon description={weather.description} />
      <div>
        <p className="text-sm font-semibold text-gray-900">
          {weather.temp}°C — {weather.description}
        </p>
        <p className="text-xs text-gray-500">
          {t.weather.feelsLike(weather.feels_like, weather.city)}
        </p>
      </div>
    </div>
  )
}
