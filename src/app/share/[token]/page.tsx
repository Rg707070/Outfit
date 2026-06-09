import { createClient } from '@/lib/supabase/server'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { translations, type Lang } from '@/lib/translations'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const cookieStore = await cookies()
  const lang: Lang = cookieStore.get('lang')?.value === 'en' ? 'en' : 'he'
  const t = translations[lang]

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (outfitItems ?? []).map((oi: any) => oi.wardrobe_items).filter(Boolean)

  return (
    <div className="min-h-screen bg-gray-50" dir={t.dir} lang={lang}>
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">👗</span>
            <span className="text-xl font-bold text-gray-900">{t.share.brand}</span>
          </Link>
          <Link href="/signup" className="text-sm font-medium text-black hover:underline">
            {t.share.createOwn}
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
                  <p className="text-gray-500 mt-1">{t.share.sharedBy(profile.full_name)}</p>
                )}
              </div>
              {outfit.is_favorite && <span className="text-2xl">❤️</span>}
            </div>

            {outfit.description && (
              <p className="text-gray-600 mt-4">{outfit.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {outfit.occasion && (
                <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{outfit.occasion}</span>
              )}
              {outfit.season && (
                <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                  {t.seasons[outfit.season as keyof typeof t.seasons] ?? outfit.season}
                </span>
              )}
            </div>
          </div>

          {/* Flat-lay grid */}
          <div className="px-8 pb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              {t.share.pieces(items.length)}
            </h2>
            {items.length === 0 ? (
              <p className="text-gray-400">{t.share.noItems}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {items.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-2xl overflow-hidden">
                    <div className="aspect-square flex items-center justify-center">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">
                          {CLOTHING_CATEGORIES.find(c => c.value === item.category)?.emoji ?? '👗'}
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
          <p className="text-gray-500 text-sm">{t.share.buildShare}</p>
          <Link href="/signup">
            <button className="mt-3 bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
              {t.share.getStarted}
            </button>
          </Link>
        </div>
      </main>
    </div>
  )
}
