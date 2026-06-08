import { createClient } from '@/lib/supabase/server'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Database } from '@/types/database'

export const dynamic = 'force-dynamic'

type OutfitItemWithWardrobe = {
  id: string
  outfit_id: string
  wardrobe_item_id: string
  position_x: number | null
  position_y: number | null
  z_index: number | null
  wardrobe_items: Database['public']['Tables']['wardrobe_items']['Row'] | null
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: outfit } = await supabase
    .from('outfits')
    .select('*')
    .eq('share_token', token)
    .eq('is_public', true)
    .maybeSingle()

  if (!outfit) notFound()

  const { data: outfitItems } = await supabase
    .from('outfit_items')
    .select('*, wardrobe_items(*)')
    .eq('outfit_id', outfit.id)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', outfit.user_id)
    .maybeSingle()

  const items = ((outfitItems as OutfitItemWithWardrobe[]) ?? [])
    .map((oi) => oi.wardrobe_items)
    .filter((item): item is Database['public']['Tables']['wardrobe_items']['Row'] => item !== null)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">👗</span>
            <span className="text-xl font-bold text-gray-900">Outfit</span>
          </Link>
          <Link href="/signup" className="text-sm font-medium text-black hover:underline">
            צור שלך — בחינם
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{outfit.name}</h1>
                {profile?.full_name && (
                  <p className="text-gray-500 mt-1">שותף על ידי {profile.full_name}</p>
                )}
              </div>
              {outfit.is_favorite && <span className="text-2xl">❤️</span>}
            </div>

            {outfit.description && <p className="text-gray-600 mt-4">{outfit.description}</p>}

            <div className="flex flex-wrap gap-2 mt-4">
              {outfit.occasion && (
                <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                  {outfit.occasion}
                </span>
              )}
              {outfit.season && (
                <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full capitalize">
                  {outfit.season}
                </span>
              )}
            </div>
          </div>

          {/* Flat-lay grid */}
          <div className="px-8 pb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              {items.length} פריטים
            </h2>
            {items.length === 0 ? (
              <p className="text-gray-400">אין פריטים בלוק זה.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {items.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-2xl overflow-hidden">
                    <div className="aspect-square relative flex items-center justify-center">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      ) : (
                        <span className="text-4xl">
                          {CLOTHING_CATEGORIES.find((c) => c.value === item.category)?.emoji ??
                            '👗'}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      {item.brand && <p className="text-xs text-gray-400 truncate">{item.brand}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">בנה ושתף לוקים שלך</p>
          <Link href="/signup">
            <button className="mt-3 bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
              התחל בחינם
            </button>
          </Link>
        </div>
      </main>
    </div>
  )
}
