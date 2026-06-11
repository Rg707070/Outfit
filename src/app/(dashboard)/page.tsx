'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WardrobeItem } from '@/types/database'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { Plus, Sparkles, ArrowLeft, Cloud, Thermometer } from 'lucide-react'
import Link from 'next/link'

interface TodayOutfit {
  outfit_id: string
  outfits: { name: string; image_url: string | null } | null
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'בוקר טוב ☀️'
  if (h < 17) return 'צהריים טובים 🌤️'
  return 'ערב טוב 🌙'
}

export default function HomePage() {
  const [userName, setUserName] = useState('')
  const [todayOutfit, setTodayOutfit] = useState<TodayOutfit | null>(null)
  const [recentItems, setRecentItems] = useState<WardrobeItem[]>([])
  const [stats, setStats] = useState({ items: 0, outfits: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const today = new Date()
  const dateStr = today.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const name =
      user.user_metadata?.full_name?.split(' ')[0] ??
      user.email?.split('@')[0] ??
      ''
    setUserName(name)

    const todayStr = today.toISOString().slice(0, 10)

    const [
      { data: calData },
      { data: recentData },
      { count: itemCount },
      { count: outfitCount },
    ] = await Promise.all([
      supabase
        .from('calendar_outfits')
        .select('outfit_id, outfits(name, image_url)')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle(),
      supabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('wardrobe_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('outfits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ])

    setTodayOutfit(calData as TodayOutfit | null)
    setRecentItems(recentData ?? [])
    setStats({ items: itemCount ?? 0, outfits: outfitCount ?? 0 })
    setLoading(false)
  }

  return (
    <div className="min-h-screen pb-nav">
      {/* Hero header */}
      <div className="bg-white px-5 pt-12 pb-6">
        <p className="text-gray-500 text-sm font-medium">{getGreeting()}</p>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">
          {loading ? '…' : userName || 'שלום'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{dateStr}</p>
      </div>

      <div className="px-4 space-y-4 mt-2">
        {/* Weather card */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">מזג אוויר</p>
            <p className="text-white text-2xl font-bold mt-1">22°C</p>
            <p className="text-blue-100 text-sm mt-0.5">מעונן חלקית · תל אביב</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Cloud size={40} className="text-white/60" />
            <p className="text-blue-100 text-xs">מרגיש כמו 20°C</p>
          </div>
        </div>

        {/* Today's outfit */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-900">הלוק של היום</p>
            <Link href="/plan" className="text-xs text-gray-400 flex items-center gap-1">
              <span>תכנן</span>
              <ArrowLeft size={12} />
            </Link>
          </div>
          {todayOutfit?.outfits ? (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0">
                {todayOutfit.outfits.image_url ? (
                  <img
                    src={todayOutfit.outfits.image_url}
                    alt={todayOutfit.outfits.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">👔</div>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{todayOutfit.outfits.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">לוק מתוכנן להיום</p>
              </div>
            </div>
          ) : (
            <Link href="/plan">
              <div className="flex items-center gap-3 py-2">
                <div className="w-16 h-16 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Plus size={22} className="text-gray-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">לא תוכנן לוק להיום</p>
                  <p className="text-xs text-gray-400 mt-0.5">לחץ לתכנון יומי</p>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/wardrobe">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-3xl font-bold text-gray-900">{loading ? '—' : stats.items}</p>
              <p className="text-xs text-gray-500 mt-1">פריטים בארון</p>
            </div>
          </Link>
          <Link href="/outfits">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-3xl font-bold text-gray-900">{loading ? '—' : stats.outfits}</p>
              <p className="text-xs text-gray-500 mt-1">לוקים שמורים</p>
            </div>
          </Link>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/wardrobe?add=1">
            <button className="w-full bg-black text-white rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Plus size={17} />
              הוסף לארון
            </button>
          </Link>
          <Link href="/outfits/new">
            <button className="w-full bg-gray-100 text-gray-900 rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Sparkles size={17} />
              צור לוק
            </button>
          </Link>
        </div>

        {/* Recently added items */}
        {recentItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">נוספו לאחרונה</p>
              <Link href="/wardrobe" className="text-xs text-gray-400 flex items-center gap-1">
                <span>הכל</span>
                <ArrowLeft size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {recentItems.map(item => (
                <Link key={item.id} href="/wardrobe">
                  <div className="aspect-square rounded-2xl bg-white overflow-hidden border border-gray-100 shadow-sm">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        {CLOTHING_CATEGORIES.find(c => c.value === item.category)?.emoji ?? '👗'}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Feature banners */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/outfits/discover">
            <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-4 text-white">
              <p className="text-xl mb-1">✨</p>
              <p className="text-sm font-bold">גלה לוקים</p>
              <p className="text-xs text-white/60 mt-0.5">קיבוצים אוטומטיים</p>
            </div>
          </Link>
          <Link href="/plan">
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-4 text-white">
              <p className="text-xl mb-1">📅</p>
              <p className="text-sm font-bold">לוח שנה</p>
              <p className="text-xs text-white/60 mt-0.5">תכנן מראש</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
