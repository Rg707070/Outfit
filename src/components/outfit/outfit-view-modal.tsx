'use client'
import { useEffect, useState } from 'react'
import { X, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Outfit } from '@/types/database'
import { useLang } from '@/lib/lang-context'
import { OutfitPreview, type PreviewItem } from './outfit-preview'

export function OutfitViewModal({
  outfit,
  onClose,
  onShare,
}: {
  outfit: Outfit
  onClose: () => void
  onShare?: (o: Outfit) => void
}) {
  const { t } = useLang()
  const [items, setItems] = useState<PreviewItem[] | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase
        .from('outfit_items')
        .select('id, wardrobe_items(id, name, category, image_url, brand)')
        .eq('outfit_id', outfit.id)
      if (!active) return
      const mapped: PreviewItem[] = (data ?? [])
        .map(row => row.wardrobe_items)
        .filter((w): w is NonNullable<typeof w> => Boolean(w))
        .map(w => ({ id: w.id, name: w.name, category: w.category, image_url: w.image_url, brand: w.brand }))
      setItems(mapped)
    }
    load()
    return () => { active = false }
  }, [outfit.id, supabase])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 rounded-t-2xl border-b border-gray-100 bg-white p-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">{outfit.name}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {outfit.occasion && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{outfit.occasion}</span>
              )}
              {outfit.season && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs capitalize text-gray-600">{outfit.season}</span>
              )}
              {outfit.is_public && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">{t.outfits.public}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onShare && (
              <button
                onClick={() => onShare(outfit)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                title={t.preview.share}
              >
                <Share2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label={t.preview.close}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {items === null ? (
            <div className="py-12 text-center text-sm text-gray-400">{t.preview.loading}</div>
          ) : (
            <OutfitPreview items={items} />
          )}
        </div>
      </div>
    </div>
  )
}
