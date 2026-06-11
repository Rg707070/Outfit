'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WardrobeItem, OutfitHistory, Outfit } from '@/types/database'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { Shirt, TrendingUp, Package, CalendarDays, Moon } from 'lucide-react'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { useLang } from '@/lib/lang-context'

type HistoryRow = OutfitHistory & { outfits: { name: string } | null }

export default function InsightsPage() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useLang()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: wi }, { data: h }, { data: o }] = await Promise.all([
      supabase.from('wardrobe_items').select('*').eq('user_id', user.id),
      supabase.from('outfit_history').select('*, outfits(name)').eq('user_id', user.id).order('worn_date', { ascending: false }),
      supabase.from('outfits').select('*').eq('user_id', user.id),
    ])
    setItems(wi ?? [])
    setHistory((h as HistoryRow[]) ?? [])
    setOutfits(o ?? [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  const today = new Date()

  const thisMonthWears = history.filter(h => {
    const d = new Date(h.worn_date)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }).length

  const categoryCounts = CLOTHING_CATEGORIES
    .map(cat => ({ ...cat, count: items.filter(i => i.category === cat.value).length }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
  const maxCount = Math.max(...categoryCounts.map(c => c.count), 1)

  const colorFreq: Record<string, number> = {}
  for (const item of items) {
    if (item.color) colorFreq[item.color] = (colorFreq[item.color] ?? 0) + 1
  }
  const topColors = Object.entries(colorFreq).sort((a, b) => b[1] - a[1]).slice(0, 20)

  const wornDates = new Set(history.map(h => h.worn_date.slice(0, 10)))
  const heatmapStart = subDays(today, 83)
  const weeks: Date[][] = []
  let cursor = new Date(heatmapStart)
  while (cursor <= today) {
    const week: Date[] = []
    for (let i = 0; i < 7 && cursor <= today; i++) {
      week.push(new Date(cursor))
      cursor = new Date(cursor.getTime() + 86_400_000)
    }
    weeks.push(week)
  }

  const sleepingItems = items
    .filter(i => !i.is_favorite)
    .sort((a, b) => (a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1)
    .slice(0, 6)

  const statCards = [
    { label: t.insights.statItems, value: items.length, icon: Shirt, bg: 'bg-purple-50', fg: 'text-purple-600', href: '/wardrobe' },
    { label: t.insights.statOutfits, value: outfits.length, icon: Package, bg: 'bg-blue-50', fg: 'text-blue-600', href: '/outfits' },
    { label: t.insights.statWears, value: history.length, icon: TrendingUp, bg: 'bg-green-50', fg: 'text-green-600', href: '/history' },
    { label: t.insights.statThisMonth, value: thisMonthWears, icon: CalendarDays, bg: 'bg-orange-50', fg: 'text-orange-600', href: '/calendar' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t.insights.title}</h1>
        <p className="text-gray-500 text-sm mt-1">{t.insights.subtitle}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(stat => (
          <Link key={stat.label} href={stat.href} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.fg} flex items-center justify-center mb-3`}>
              <stat.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t.insights.categoryBreakdown}</h2>
          {categoryCounts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">{t.insights.noItems}</p>
              <Link href="/wardrobe" className="text-xs text-gray-400 underline mt-1 inline-block">{t.insights.addToWardrobe}</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {categoryCounts.map(cat => (
                <div key={cat.value}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-700">{cat.emoji} {t.categories[cat.value as keyof typeof t.categories]}</span>
                    <span className="text-sm font-semibold text-gray-900">{cat.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black rounded-full"
                      style={{ width: `${(cat.count / maxCount) * 100}%`, transition: 'width 0.6s ease-out' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Color DNA */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t.insights.colorPalette}</h2>
          {topColors.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">{t.insights.noColors}</p>
              <p className="text-gray-400 text-xs mt-1">{t.insights.noColorsSub}</p>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap gap-3 mb-4">
                {topColors.map(([color, count]) => (
                  <div key={color} className="flex flex-col items-center gap-1">
                    <div
                      className="w-10 h-10 rounded-full border-4 border-white shadow-md ring-1 ring-black/5"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                    <span className="text-xs text-gray-400 tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">{t.insights.uniqueColors(topColors.length)}</p>
            </div>
          )}
        </div>

        {/* Wear heatmap */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">{t.insights.wearFrequency}</h2>
            <span className="text-xs text-gray-400">{t.insights.last12Weeks}</span>
          </div>
          {history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">{t.insights.noWearHistory}</p>
              <Link href="/history" className="text-xs text-gray-400 underline mt-1 inline-block">
                {t.insights.startLogging}
              </Link>
            </div>
          ) : (
            <div>
              <div className="flex gap-1 mb-1">
                <div className="flex flex-col gap-1 me-1">
                  {t.insights.heatmapDays.map((d, i) => (
                    <div key={i} className="w-3 h-3 flex items-center justify-center">
                      <span className="text-[9px] text-gray-300 leading-none">{d}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 overflow-x-auto">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1 flex-shrink-0">
                      {week.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd')
                        const isWorn = wornDates.has(dateStr)
                        return (
                          <div
                            key={dateStr}
                            className="w-3 h-3 rounded-sm"
                            title={`${format(day, 'dd/MM')}${isWorn ? ` · ${t.insights.wornTooltip}` : ''}`}
                            style={{ backgroundColor: isWorn ? '#111827' : '#f0f0f0' }}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-gray-100" />
                  <span className="text-xs text-gray-400">{t.insights.notWorn}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-gray-900" />
                  <span className="text-xs text-gray-400">{t.insights.worn}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sleeping items */}
        {sleepingItems.length > 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Moon size={18} className="text-amber-500" />
              <h2 className="text-base font-semibold text-gray-900">{t.insights.sleepingItems}</h2>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{t.insights.wakeThem}</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">{t.insights.sleepingSub}</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {sleepingItems.map(item => (
                <Link key={item.id} href="/outfits/new" className="group">
                  <div className="bg-white rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-gray-50 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">
                          {CLOTHING_CATEGORIES.find(c => c.value === item.category)?.emoji ?? '👗'}
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-amber-600 group-hover:text-amber-700 transition-colors">{t.insights.buildOutfit}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="lg:col-span-2 text-center py-16">
            <span className="text-5xl">📊</span>
            <p className="text-gray-500 mt-4 text-lg font-medium">{t.insights.noData}</p>
            <p className="text-gray-400 text-sm mt-1">{t.insights.noDataSub}</p>
            <Link href="/wardrobe" className="inline-block mt-6 bg-black text-white px-6 py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors">
              {t.insights.buildWardrobe}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
