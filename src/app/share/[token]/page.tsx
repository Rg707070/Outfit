import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { OutfitPreview, type PreviewItem } from '@/components/outfit/outfit-preview'

export const dynamic = 'force-dynamic'

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

  const items: PreviewItem[] = (outfitItems ?? [])
    .map(oi => oi.wardrobe_items)
    .filter((w): w is NonNullable<typeof w> => Boolean(w))
    .map(w => ({ id: w.id, name: w.name, category: w.category, image_url: w.image_url, brand: w.brand }))

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

            {outfit.description && (
              <p className="text-gray-600 mt-4">{outfit.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {outfit.occasion && (
                <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{outfit.occasion}</span>
              )}
              {outfit.season && (
                <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full capitalize">{outfit.season}</span>
              )}
            </div>
          </div>

          {/* Flat-lay / on-model preview */}
          <div className="px-8 pb-8">
            <OutfitPreview items={items} />
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
