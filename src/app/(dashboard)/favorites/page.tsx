'use client'
import Image from 'next/image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Outfit, WardrobeItem } from '@/types/database'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/auth-context'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function FavoritesPage() {
  const [tab, setTab] = useState<'outfits' | 'items'>('outfits')
  const { toast } = useToast()
  const { user } = useAuth()
  const supabase = createClient()
  const qc = useQueryClient()

  const { data: favoriteOutfits = [], isLoading: loadingOutfits } = useQuery({
    queryKey: ['favorites-outfits', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Outfit[]> => {
      const { data, error } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_favorite', true)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: favoriteItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['favorites-items', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WardrobeItem[]> => {
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_favorite', true)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const unfavoriteOutfit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('outfits').update({ is_favorite: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites-outfits', user?.id] })
      qc.invalidateQueries({ queryKey: ['outfits', user?.id] })
    },
  })

  const unfavoriteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('wardrobe_items')
        .update({ is_favorite: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites-items', user?.id] })
      qc.invalidateQueries({ queryKey: ['wardrobe', user?.id] })
    },
  })

  const loading = loadingOutfits || loadingItems

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">מועדפים</h1>
        <span className="text-2xl">❤️</span>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'outfits', label: `לוקים (${favoriteOutfits.length})` },
          { key: 'items', label: `פריטים (${favoriteItems.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as 'outfits' | 'items')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-black text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : tab === 'outfits' ? (
        favoriteOutfits.length === 0 ? (
          <EmptyFav
            text="אין לוקים מועדפים עדיין"
            sub="לחץ על לב בכרטיס לוק כדי לראות אותו כאן"
            href="/outfits"
            cta="צפה בלוקים"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteOutfits.map((outfit) => (
              <div
                key={outfit.id}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-40 bg-gray-50 dark:bg-gray-800 flex items-center justify-center relative">
                  {outfit.image_url ? (
                    <Image
                      src={outfit.image_url}
                      alt={outfit.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  ) : (
                    <span className="text-4xl">👔</span>
                  )}
                  <button
                    onClick={() => {
                      unfavoriteOutfit.mutate(outfit.id)
                      toast(`"${outfit.name}" הוסר מהמועדפים`)
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 z-10"
                    aria-label="הסר ממועדפים"
                  >
                    <Heart size={14} className="fill-red-500 text-red-500" />
                  </button>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {outfit.name}
                    </p>
                    {outfit.occasion && (
                      <p className="text-xs text-gray-400 mt-0.5">{outfit.occasion}</p>
                    )}
                  </div>
                  <Heart size={16} className="fill-red-500 text-red-500 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : favoriteItems.length === 0 ? (
        <EmptyFav
          text="אין פריטים מועדפים עדיין"
          sub="לחץ על לב בפריט בארון כדי לראות אותו כאן"
          href="/wardrobe"
          cta="עבור לארון"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {favoriteItems.map((item) => (
            <div
              key={item.id}
              className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-gray-50 dark:bg-gray-800 flex items-center justify-center relative">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 20vw"
                  />
                ) : (
                  <span className="text-3xl">👗</span>
                )}
                <button
                  onClick={() => {
                    unfavoriteItem.mutate(item.id)
                    toast(`"${item.name}" הוסר מהמועדפים`)
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 z-10"
                  aria-label="הסר ממועדפים"
                >
                  <Heart size={12} className="fill-red-500 text-red-500" />
                </button>
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  {item.brand && <p className="text-xs text-gray-400 truncate">{item.brand}</p>}
                </div>
                <Heart size={14} className="fill-red-500 text-red-500 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyFav({
  text,
  sub,
  href,
  cta,
}: {
  text: string
  sub: string
  href: string
  cta: string
}) {
  return (
    <div className="text-center py-20">
      <Heart size={40} className="mx-auto text-gray-200" />
      <p className="text-gray-500 mt-4 font-medium">{text}</p>
      <p className="text-gray-400 text-sm mt-1">{sub}</p>
      <Link
        href={href}
        className="inline-block mt-6 bg-black text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        {cta}
      </Link>
    </div>
  )
}
