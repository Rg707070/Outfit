'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Outfit, OutfitHistory, WardrobeItem } from '@/types/database'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { getWeather, type WeatherData } from '@/lib/weather'
import { recommendOutfits, type ReasonCode } from '@/lib/recommend'
import { WeatherWidget } from '@/components/weather/weather-widget'
import { useToast } from '@/components/ui/toast'
import { useLang } from '@/lib/lang-context'
import { Sparkles, RefreshCw, Check } from 'lucide-react'
import Link from 'next/link'

type ItemsByOutfit = Record<string, WardrobeItem[]>

function OutfitThumbs({ outfit, items, size }: { outfit: Outfit; items: WardrobeItem[]; size: 'lg' | 'sm' }) {
  if (outfit.image_url) {
    return <img src={outfit.image_url} alt={outfit.name} className="w-full h-full object-cover" />
  }
  const shown = items.slice(0, 4)
  if (shown.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-4xl">👗</div>
  }
  return (
    <div className="w-full h-full grid grid-cols-2 gap-1 p-1 bg-gray-50">
      {shown.map((item) => (
        <div key={item.id} className="bg-white rounded-lg overflow-hidden flex items-center justify-center min-h-0">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <span className={size === 'lg' ? 'text-3xl' : 'text-xl'}>
              {CLOTHING_CATEGORIES.find((c) => c.value === item.category)?.emoji ?? '👗'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function TodayPage() {
  const { t } = useLang()
  const { toast } = useToast()
  const supabase = createClient()
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [history, setHistory] = useState<OutfitHistory[]>([])
  const [itemsByOutfit, setItemsByOutfit] = useState<ItemsByOutfit>({})
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [occasion, setOccasion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [seed, setSeed] = useState(0)

  useEffect(() => { load() }, [])

  async function load() {
    getWeather({ description: t.weather.demo, city: t.weather.demoCity }).then(setWeather)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: o }, { data: h }] = await Promise.all([
      supabase.from('outfits').select('*').eq('user_id', user.id),
      supabase.from('outfit_history').select('*').eq('user_id', user.id),
    ])
    const loadedOutfits = o ?? []
    setOutfits(loadedOutfits)
    setHistory(h ?? [])

    if (loadedOutfits.length) {
      const { data: oi } = await supabase
        .from('outfit_items')
        .select('*, wardrobe_items(*)')
        .in('outfit_id', loadedOutfits.map((x) => x.id))
      const grouped: ItemsByOutfit = {}
      for (const row of oi ?? []) {
        const item = (row as { wardrobe_items: WardrobeItem | null }).wardrobe_items
        if (!item) continue
        ;(grouped[row.outfit_id] ??= []).push(item)
      }
      setItemsByOutfit(grouped)
    }
    setLoading(false)
  }

  const ranked = useMemo(
    () => recommendOutfits({ outfits, history, temp: weather?.temp ?? null, occasion }),
    // seed forces a re-shuffle of equal-scored ties after "wear today"
    [outfits, history, weather, occasion, seed],
  )

  async function wearToday(outfit: Outfit) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const worn_date = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('outfit_history')
      .insert({ user_id: user.id, outfit_id: outfit.id, worn_date, category_label: occasion })
      .select()
      .single()
    if (data) setHistory((prev) => [...prev, data])
    setSeed((s) => s + 1)
    toast(t.today.worn)
  }

  const hero = ranked[0]
  const alternates = ranked.slice(1, 7)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Sparkles size={22} className="text-amber-500" />
            {t.today.title}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t.today.sub}</p>
        </div>
        <button
          onClick={() => setSeed((s) => s + 1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <RefreshCw size={15} />
          {t.today.refresh}
        </button>
      </div>

      <div className="my-4 max-w-sm">
        <WeatherWidget />
      </div>

      {/* Occasion filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-1">
        <button
          onClick={() => setOccasion(null)}
          className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
            occasion === null ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {t.today.occasionAny}
        </button>
        {t.today.occasions.map((occ) => (
          <button
            key={occ}
            onClick={() => setOccasion(occ === occasion ? null : occ)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              occasion === occ ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {occ}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="aspect-[4/3] max-w-md bg-gray-100 rounded-3xl animate-pulse" />
        </div>
      ) : !hero ? (
        <div className="text-center py-20">
          <span className="text-5xl">🪄</span>
          <p className="text-gray-500 mt-4 text-lg font-medium">{t.today.noOutfits}</p>
          <p className="text-gray-400 text-sm mt-1">{t.today.noOutfitsSub}</p>
          <Link href="/outfits/new" className="inline-block mt-6 bg-black text-white px-6 py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors">
            {t.today.createOutfit}
          </Link>
        </div>
      ) : (
        <>
          {/* Hero suggestion */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden max-w-md mb-8">
            <span className="inline-block m-4 mb-0 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              {t.today.pickedForYou}
            </span>
            <div className="aspect-[4/3] m-4 mt-3 rounded-2xl overflow-hidden border border-gray-100">
              <OutfitThumbs outfit={hero.outfit} items={itemsByOutfit[hero.outfit.id] ?? []} size="lg" />
            </div>
            <div className="px-4 pb-4">
              <h2 className="text-xl font-bold text-gray-900">{hero.outfit.name}</h2>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {hero.reasons.map((r) => (
                  <span key={r} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {t.today.reasons[r as ReasonCode]}
                  </span>
                ))}
              </div>
              <button
                onClick={() => wearToday(hero.outfit)}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-black text-white py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors"
              >
                <Check size={18} />
                {t.today.wearThis}
              </button>
            </div>
          </div>

          {/* Alternates */}
          {alternates.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">{t.today.alternates}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {alternates.map(({ outfit, reasons }) => (
                  <div key={outfit.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square">
                      <OutfitThumbs outfit={outfit} items={itemsByOutfit[outfit.id] ?? []} size="sm" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{outfit.name}</p>
                      {reasons[0] && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{t.today.reasons[reasons[0]]}</p>
                      )}
                      <button
                        onClick={() => wearToday(outfit)}
                        className="w-full mt-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl py-1.5 hover:bg-gray-50 transition-colors"
                      >
                        {t.today.wearThis}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
