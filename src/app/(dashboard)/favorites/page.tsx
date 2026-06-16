'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Outfit, WardrobeItem } from '@/types/database'
import { useToast } from '@/components/ui/toast'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { useLang } from '@/lib/lang-context'

export default function FavoritesPage() {
  const [favoriteOutfits, setFavoriteOutfits] = useState<Outfit[]>([])
  const [favoriteItems, setFavoriteItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'outfits' | 'items'>('outfits')
  const { toast } = useToast()
  const { t } = useLang()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: outfits }, { data: items }] = await Promise.all([
      supabase.from('outfits').select('*').eq('user_id', user.id).eq('is_favorite', true).order('updated_at', { ascending: false }),
      supabase.from('wardrobe_items').select('*').eq('user_id', user.id).eq('is_favorite', true).order('updated_at', { ascending: false }),
    ])
    setFavoriteOutfits(outfits ?? [])
    setFavoriteItems(items ?? [])
    setLoading(false)
  }

  async function unfavoriteOutfit(outfit: Outfit) {
    await supabase.from('outfits').update({ is_favorite: false }).eq('id', outfit.id)
    setFavoriteOutfits(prev => prev.filter(o => o.id !== outfit.id))
    toast(`"${outfit.name}" ${t.favorites.noFavOutfitsSub}`)
  }

  async function unfavoriteItem(item: WardrobeItem) {
    await supabase.from('wardrobe_items').update({ is_favorite: false }).eq('id', item.id)
    setFavoriteItems(prev => prev.filter(i => i.id !== item.id))
    toast(`"${item.name}" ${t.favorites.noFavItemsSub}`)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{t.favorites.title}</h1>
        <span className="text-2xl">❤️</span>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'outfits', label: t.favorites.outfits(favoriteOutfits.length) },
          { key: 'items', label: t.favorites.items(favoriteItems.length) },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as 'outfits' | 'items')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              tab === key
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-stone-100 rounded-2xl h-48 animate-shimmer" />
          ))}
        </div>
      ) : tab === 'outfits' ? (
        favoriteOutfits.length === 0 ? (
          <EmptyFav
            text={t.favorites.noFavOutfits}
            sub={t.favorites.noFavOutfitsSub}
            href="/outfits"
            cta={t.nav.outfits}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteOutfits.map(outfit => (
              <div key={outfit.id} className="group bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-stone-200/60 transition-all duration-300 hover:-translate-y-1">
                <div className="h-40 bg-stone-50 flex items-center justify-center relative">
                  {outfit.image_url
                    ? <img src={outfit.image_url} alt={outfit.name} className="w-full h-full object-cover" />
                    : <span className="text-4xl">👔</span>}
                  <button
                    onClick={() => unfavoriteOutfit(outfit)}
                    className="absolute top-3 right-3 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                  >
                    <Heart size={14} className="fill-rose-500 text-rose-500" />
                  </button>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900 truncate">{outfit.name}</p>
                    {outfit.occasion && <p className="text-xs text-stone-400 mt-0.5">{outfit.occasion}</p>}
                  </div>
                  <Heart size={16} className="fill-rose-500 text-rose-500 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        favoriteItems.length === 0 ? (
          <EmptyFav
            text={t.favorites.noFavItems}
            sub={t.favorites.noFavItemsSub}
            href="/wardrobe"
            cta={t.nav.wardrobe}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {favoriteItems.map(item => (
              <div key={item.id} className="group bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-stone-200/60 transition-all duration-300 hover:-translate-y-1">
                <div className="aspect-square bg-stone-50 flex items-center justify-center relative">
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    : <span className="text-3xl">👗</span>}
                  <button
                    onClick={() => unfavoriteItem(item)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                  >
                    <Heart size={12} className="fill-rose-500 text-rose-500" />
                  </button>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{item.name}</p>
                    {item.brand && <p className="text-xs text-stone-400 truncate">{item.brand}</p>}
                  </div>
                  <Heart size={14} className="fill-rose-500 text-rose-500 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function EmptyFav({ text, sub, href, cta }: { text: string; sub: string; href: string; cta: string }) {
  return (
    <div className="text-center py-20 animate-fade-in">
      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Heart size={28} className="text-rose-300" />
      </div>
      <p className="text-stone-600 mt-2 font-semibold">{text}</p>
      <p className="text-stone-400 text-sm mt-1">{sub}</p>
      <Link href={href} className="inline-block mt-6 bg-stone-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-800 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]">
        {cta}
      </Link>
    </div>
  )
}
