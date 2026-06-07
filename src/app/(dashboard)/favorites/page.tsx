'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Outfit, WardrobeItem } from '@/types/database'
import { Heart } from 'lucide-react'
import { useLang } from '@/lib/lang-context'

export default function FavoritesPage() {
  const { t } = useLang()
  const [favoriteOutfits, setFavoriteOutfits] = useState<Outfit[]>([])
  const [favoriteItems, setFavoriteItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'outfits' | 'items'>('outfits')
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t.favorites.title}</h1>
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
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === key ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : tab === 'outfits' ? (
        favoriteOutfits.length === 0 ? (
          <EmptyFav text={t.favorites.noFavOutfits} sub={t.favorites.noFavOutfitsSub} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteOutfits.map(outfit => (
              <div key={outfit.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="h-40 bg-gray-50 flex items-center justify-center">
                  {outfit.image_url ? <img src={outfit.image_url} alt={outfit.name} className="w-full h-full object-cover" /> : <span className="text-4xl">👔</span>}
                </div>
                <div className="p-4 flex items-center justify-between">
                  <p className="font-medium text-gray-900">{outfit.name}</p>
                  <Heart size={16} className="fill-red-500 text-red-500" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        favoriteItems.length === 0 ? (
          <EmptyFav text={t.favorites.noFavItems} sub={t.favorites.noFavItemsSub} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {favoriteItems.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="aspect-square bg-gray-50 flex items-center justify-center">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-3xl">👗</span>}
                </div>
                <div className="p-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <Heart size={14} className="fill-red-500 text-red-500 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function EmptyFav({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="text-center py-20">
      <Heart size={40} className="mx-auto text-gray-200" />
      <p className="text-gray-500 mt-4 font-medium">{text}</p>
      <p className="text-gray-400 text-sm mt-1">{sub}</p>
    </div>
  )
}
